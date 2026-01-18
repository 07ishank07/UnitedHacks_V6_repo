from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import Decision, User, Vote, Follow
from app.services.gemini import predict_consequences, generate_consensus_recommendation
from app.auth import get_current_user_optional, get_current_user
from typing import Optional, List
from difflib import SequenceMatcher

router = APIRouter()

@router.post("/decisions/")
async def create_decision(decision: Decision, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, decision.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate required fields
    if not decision.option_a or not decision.option_b:
        raise HTTPException(status_code=400, detail="Both option_a and option_b are required")

    # Save to DB
    session.add(decision)
    session.commit()
    session.refresh(decision)
    return decision

@router.get("/decisions/")
def read_decisions(
    offset: int = 0,
    limit: int = 20,
    user_id: Optional[int] = None,
    following_user_id: Optional[int] = None,  # Get decisions from users this user follows
    search: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get decisions feed - supports filtering by user, following, or search"""
    query = select(Decision)
    
    # Filter by specific user
    if user_id:
        query = query.where(Decision.user_id == user_id)
    # Filter by users that a specific user follows
    elif following_user_id:
        # Get IDs of users being followed
        follows = session.exec(
            select(Follow).where(Follow.follower_id == following_user_id)
        ).all()
        following_ids = [f.following_id for f in follows]
        if following_ids:
            query = query.where(Decision.user_id.in_(following_ids))
        else:
            # Return empty if not following anyone
            return []
    # Search in decision content
    elif search:
        query = query.where(Decision.content.ilike(f"%{search}%"))
    
    decisions = session.exec(
        query
        .order_by(Decision.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    
    # Enrich with vote counts and user info
    result = []
    for decision in decisions:
        vote_counts = session.exec(
            select(func.count(Vote.id)).where(Vote.decision_id == decision.id)
        ).first() or 0
        option_a_count = session.exec(
            select(func.count(Vote.id)).where(
                Vote.decision_id == decision.id,
                Vote.choice == "option_a"
            )
        ).first() or 0
        option_b_count = session.exec(
            select(func.count(Vote.id)).where(
                Vote.decision_id == decision.id,
                Vote.choice == "option_b"
            )
        ).first() or 0

        user = session.get(User, decision.user_id)
        result.append({
            **decision.dict(),
            "user": user.dict() if user else None,
            "vote_counts": {
                "total": vote_counts,
                "option_a": option_a_count,
                "option_b": option_b_count
            }
        })
    
    return result

@router.get("/decisions/{decision_id}")
def get_decision(decision_id: int, session: Session = Depends(get_session)):
    decision = session.get(Decision, decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    # Get vote counts
    option_a_count = session.exec(
        select(func.count(Vote.id)).where(
            Vote.decision_id == decision_id,
            Vote.choice == "option_a"
        )
    ).first() or 0
    option_b_count = session.exec(
        select(func.count(Vote.id)).where(
            Vote.decision_id == decision_id,
            Vote.choice == "option_b"
        )
    ).first() or 0

    user = session.get(User, decision.user_id)

    return {
        **decision.dict(),
        "user": user.dict() if user else None,
        "vote_counts": {
            "option_a": option_a_count,
            "option_b": option_b_count
        }
    }

@router.delete("/decisions/{decision_id}")
def delete_decision(
    decision_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    decision = session.get(Decision, decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Check if the current user owns this decision
    if decision.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own decisions")

    session.delete(decision)
    session.commit()
    return {"message": "Decision deleted successfully"}

def find_similar_decisions(decision_text: str, session: Session, limit: int = 20) -> List[dict]:
    """Find decisions similar to the given text based on content similarity."""
    # Get all decisions
    all_decisions = session.exec(select(Decision)).all()

    # Calculate similarity scores
    similarities = []
    for decision in all_decisions:
        # Simple similarity based on sequence matching
        similarity = SequenceMatcher(None, decision_text.lower(), decision.content.lower()).ratio()

        # Also get vote counts for this decision
        do_it_count = session.exec(
            select(func.count(Vote.id)).where(
                Vote.decision_id == decision.id,
                Vote.choice == "do_it"
            )
        ).first() or 0
        dont_do_it_count = session.exec(
            select(func.count(Vote.id)).where(
                Vote.decision_id == decision.id,
                Vote.choice == "dont_do_it"
            )
        ).first() or 0

        similarities.append({
            'decision': decision,
            'similarity': similarity,
            'do_it_count': do_it_count,
            'dont_do_it_count': dont_do_it_count,
            'total_votes': do_it_count + dont_do_it_count
        })

    # Filter out very low similarity and sort by similarity and vote count
    filtered_similarities = [
        s for s in similarities
        if s['similarity'] > 0.3 and s['total_votes'] > 0  # At least some similarity and votes
    ]

    # Sort by combination of similarity and vote count (prioritize well-voted similar decisions)
    filtered_similarities.sort(
        key=lambda x: x['similarity'] * 0.7 + (x['total_votes'] / 100) * 0.3,
        reverse=True
    )

    # Return top similar decisions with their vote data
    return [
        {
            'id': s['decision'].id,
            'content': s['decision'].content,
            'do_it_count': s['do_it_count'],
            'dont_do_it_count': s['dont_do_it_count'],
            'similarity': s['similarity']
        }
        for s in filtered_similarities[:limit]
    ]

@router.get("/decisions/recommend/{decision_text:path}")
async def get_consensus_recommendation(
    decision_text: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    session: Session = Depends(get_session)
):
    """Get AI recommendation based on community consensus from similar decisions."""
    # Find similar decisions with vote data
    similar_decisions = find_similar_decisions(decision_text, session)

    if not similar_decisions:
        return {
            "recommendation": "Not enough similar decisions with community votes to provide a consensus-based recommendation.",
            "similar_decisions_count": 0
        }

    # Generate AI recommendation based on consensus
    try:
        recommendation = await generate_consensus_recommendation(decision_text, similar_decisions)
        return {
            "recommendation": recommendation,
            "similar_decisions_count": len(similar_decisions),
            "top_similar_decisions": similar_decisions[:5]  # Include top 5 for context
        }
    except Exception as e:
        print(f"Consensus recommendation error: {e}")
        return {
            "recommendation": "Unable to generate consensus analysis at this time.",
            "similar_decisions_count": len(similar_decisions)
        }
