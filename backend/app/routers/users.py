from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import User, Decision, Follow, Vote
from app.services.gemini import predict_personality, analyze_life_areas
from app.auth import (
    get_password_hash, authenticate_user, create_access_token,
    get_current_user, get_current_user_optional
)
from typing import Optional, List
from pydantic import BaseModel, EmailStr

router = APIRouter()

# Pydantic models for auth
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    bio: Optional[str]
    avatar_url: Optional[str]
    created_at: str

@router.post("/auth/register", response_model=UserResponse)
async def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
    """Register a new user with email and password."""
    # Check if username already exists
    existing_user = session.exec(select(User).where(User.username == user_data.username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Check if email already exists
    existing_email = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user with hashed password
    hashed_password = get_password_hash(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password
    )

    session.add(user)
    session.commit()
    session.refresh(user)
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        bio=user.bio,
        avatar_url=user.avatar_url,
        created_at=user.created_at.isoformat()
    )

@router.post("/auth/login", response_model=Token)
async def login_user(credentials: UserLogin, session: Session = Depends(get_session)):
    """Login user and return JWT token."""
    user = authenticate_user(session, credentials.username, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return Token(access_token=access_token, token_type="bearer")

@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at.isoformat()
    )

@router.put("/auth/me")
async def update_user_profile(
    bio: Optional[str] = None,
    avatar_url: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update current user's profile."""
    if bio is not None:
        current_user.bio = bio
    if avatar_url is not None:
        current_user.avatar_url = avatar_url

    session.commit()
    session.refresh(current_user)
    return {"message": "Profile updated successfully"}

# Legacy endpoint for backward compatibility (creates user without password - NOT SECURE)
@router.post("/users/")
async def create_user_legacy(user: User, session: Session = Depends(get_session)):
    raise HTTPException(
        status_code=410,
        detail="This endpoint is deprecated. Use /auth/register instead."
    )

@router.get("/users/{user_id}")
async def get_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get stats
    decisions_count = session.exec(
        select(func.count(Decision.id)).where(Decision.user_id == user_id)
    ).first() or 0
    
    followers_count = session.exec(
        select(func.count(Follow.id)).where(Follow.following_id == user_id)
    ).first() or 0
    
    following_count = session.exec(
        select(func.count(Follow.id)).where(Follow.follower_id == user_id)
    ).first() or 0
    
    return {
        **user.dict(),
        "decisions_count": decisions_count,
        "followers_count": followers_count,
        "following_count": following_count
    }

@router.get("/users/")
async def search_users(q: Optional[str] = Query(None, description="Search query"), session: Session = Depends(get_session)):
    """Search users by username"""
    if not q:
        # Return all users if no query
        users = session.exec(select(User).limit(50)).all()
    else:
        # Search users by username
        users = session.exec(
            select(User).where(User.username.ilike(f"%{q}%")).limit(20)
        ).all()
    
    # Add followers_count to each user
    result = []
    for user in users:
        followers_count = session.exec(
            select(func.count(Follow.id)).where(Follow.following_id == user.id)
        ).first()
        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "bio": user.bio,
            "avatar_url": user.avatar_url,
            "created_at": user.created_at.isoformat(),
            "followers_count": followers_count or 0
        })
    return result

@router.post("/users/{follower_id}/follow/{following_id}")
async def follow_user(follower_id: int, following_id: int, session: Session = Depends(get_session)):
    if follower_id == following_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if users exist
    follower = session.get(User, follower_id)
    following = session.get(User, following_id)
    if not follower or not following:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already following
    existing_follow = session.exec(
        select(Follow).where(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id
        )
    ).first()
    
    if existing_follow:
        raise HTTPException(status_code=400, detail="Already following this user")
    
    follow = Follow(follower_id=follower_id, following_id=following_id)
    session.add(follow)
    session.commit()
    session.refresh(follow)
    return follow

@router.delete("/users/{follower_id}/follow/{following_id}")
async def unfollow_user(follower_id: int, following_id: int, session: Session = Depends(get_session)):
    follow = session.exec(
        select(Follow).where(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id
        )
    ).first()
    
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this user")
    
    session.delete(follow)
    session.commit()
    return {"message": "Unfollowed successfully"}

@router.get("/users/{user_id}/following")
async def get_following(user_id: int, session: Session = Depends(get_session)):
    """Get users that this user is following"""
    follows = session.exec(
        select(Follow).where(Follow.follower_id == user_id)
    ).all()
    
    following_ids = [f.following_id for f in follows]
    users = session.exec(
        select(User).where(User.id.in_(following_ids))
    ).all()
    return users

@router.get("/users/{user_id}/followers")
async def get_followers(user_id: int, session: Session = Depends(get_session)):
    """Get users following this user"""
    follows = session.exec(
        select(Follow).where(Follow.following_id == user_id)
    ).all()
    
    follower_ids = [f.follower_id for f in follows]
    users = session.exec(
        select(User).where(User.id.in_(follower_ids))
    ).all()
    return users

@router.get("/users/{user_id}/decisions")
async def get_user_decisions(user_id: int, limit: int = 20, offset: int = 0, session: Session = Depends(get_session)):
    """Get decisions by a specific user with vote counts and user data"""
    decisions = session.exec(
        select(Decision)
        .where(Decision.user_id == user_id)
        .order_by(Decision.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    # Get the user data (all decisions belong to the same user)
    user = session.get(User, user_id)

    # Enrich with vote counts and user data
    result = []
    for decision in decisions:
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

        result.append({
            **decision.dict(),
            "user": user.dict() if user else None,
            "vote_counts": {
                "option_a": option_a_count,
                "option_b": option_b_count
            }
        })

    return result

@router.get("/users/{user_id}/personality")
async def get_user_personality(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all decisions by this user
    decisions = session.exec(select(Decision).where(Decision.user_id == user_id)).all()

    if not decisions:
        return {"personality_report": "Not enough data - post some decisions first!"}

    # Compile decision texts
    decision_texts = [d.content for d in decisions]

    # Get AI personality analysis
    try:
        personality_report = await predict_personality(decision_texts)
        return {"personality_report": personality_report}
    except Exception as e:
        print(f"Personality AI Error: {e}")
        return {"personality_report": "AI analysis unavailable"}

@router.get("/users/{user_id}/life-areas")
async def get_user_life_areas(user_id: int, session: Session = Depends(get_session)):
    """Get AI-powered life area analysis and personalized recommendations."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all decisions by this user
    decisions = session.exec(select(Decision).where(Decision.user_id == user_id)).all()

    # Compile decision texts
    decision_texts = [d.content for d in decisions]

    # Get AI life areas analysis
    try:
        analysis = await analyze_life_areas(decision_texts)
        return analysis
    except Exception as e:
        print(f"Life Areas AI Error: {e}")
        return {
            "life_areas": {
                "career": 50,
                "relationships": 50,
                "future": 50,
                "personal_growth": 50
            },
            "recommendations": {
                "career": "AI analysis unavailable at this time.",
                "relationships": "AI analysis unavailable at this time.",
                "future": "AI analysis unavailable at this time.",
                "personal_growth": "AI analysis unavailable at this time."
            }
        }
