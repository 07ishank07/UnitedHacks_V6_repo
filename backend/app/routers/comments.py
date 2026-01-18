from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import Comment, Decision, User, CommentLike
from app.auth import get_current_user, get_current_user_optional
from typing import Optional, List

router = APIRouter()

@router.post("/comments/")
async def create_comment(
    comment: Comment,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Check if decision exists
    decision = session.get(Decision, comment.decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Set the user_id to the current user
    comment.user_id = current_user.id

    session.add(comment)
    session.commit()
    session.refresh(comment)

    # Return comment with user info
    user = session.get(User, comment.user_id)
    return {
        **comment.dict(),
        "user": user.dict() if user else None
    }

@router.get("/comments/{decision_id}")
async def get_comments(
    decision_id: int,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = "newest",
    current_user: Optional[User] = Depends(get_current_user_optional),
    session: Session = Depends(get_session)
):
    # Check if decision exists
    decision = session.get(Decision, decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Build query with sorting
    query = select(Comment).where(Comment.decision_id == decision_id)

    if sort_by == "oldest":
        query = query.order_by(Comment.created_at.asc())
    elif sort_by == "most_liked":
        # This would require a subquery to count likes, for now just use newest
        query = query.order_by(Comment.created_at.desc())
    else:  # newest (default)
        query = query.order_by(Comment.created_at.desc())

    comments = session.exec(
        query.offset(offset).limit(limit)
    ).all()

    # Enrich with user info and likes
    result = []
    for comment in comments:
        user = session.get(User, comment.user_id)

        # Count likes
        likes_count = session.exec(
            select(func.count(CommentLike.id)).where(CommentLike.comment_id == comment.id)
        ).first() or 0

        # Check if current user liked this comment
        user_liked = False
        if current_user:
            user_like = session.exec(
                select(CommentLike).where(
                    CommentLike.comment_id == comment.id,
                    CommentLike.user_id == current_user.id
                )
            ).first()
            user_liked = user_like is not None

        result.append({
            **comment.dict(),
            "user": user.dict() if user else None,
            "likes_count": likes_count,
            "user_liked": user_liked
        })

    return result

@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check if user owns the comment
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    session.delete(comment)
    session.commit()
    return {"message": "Comment deleted successfully"}

@router.post("/comments/{comment_id}/like")
async def like_comment(
    comment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Check if comment exists
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check if user already liked this comment
    existing_like = session.exec(
        select(CommentLike).where(
            CommentLike.comment_id == comment_id,
            CommentLike.user_id == current_user.id
        )
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail="Comment already liked")

    # Create like
    like = CommentLike(comment_id=comment_id, user_id=current_user.id)
    session.add(like)
    session.commit()
    session.refresh(like)

    # Get updated like count
    likes_count = session.exec(
        select(func.count(CommentLike.id)).where(CommentLike.comment_id == comment_id)
    ).first() or 0

    return {"likes_count": likes_count, "user_liked": True}

@router.delete("/comments/{comment_id}/like")
async def unlike_comment(
    comment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Check if comment exists
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Find and delete the like
    like = session.exec(
        select(CommentLike).where(
            CommentLike.comment_id == comment_id,
            CommentLike.user_id == current_user.id
        )
    ).first()

    if not like:
        raise HTTPException(status_code=404, detail="Like not found")

    session.delete(like)
    session.commit()

    # Get updated like count
    likes_count = session.exec(
        select(func.count(CommentLike.id)).where(CommentLike.comment_id == comment_id)
    ).first() or 0

    return {"likes_count": likes_count, "user_liked": False}
