from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str  # Hashed password
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    decisions: List["Decision"] = Relationship(back_populates="user")
    votes: List["Vote"] = Relationship(back_populates="user")
    comments: List["Comment"] = Relationship(back_populates="user")
    comment_likes: List["CommentLike"] = Relationship(back_populates="user")
    # Don't use relationships for Follow - query manually instead
    # This avoids ambiguity issues with multiple foreign keys

class Follow(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    follower_id: int = Field(foreign_key="user.id")
    following_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # No relationships here - we'll query Users separately in the routers

class Decision(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    content: str
    option_a: str  # Required custom option A
    option_b: str  # Required custom option B
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional[User] = Relationship(back_populates="decisions")
    votes: List["Vote"] = Relationship(back_populates="decision")
    comments: List["Comment"] = Relationship(back_populates="decision")

class Vote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    decision_id: int = Field(foreign_key="decision.id")
    choice: str  # "do_it" or "dont_do_it" (or option_a/option_b)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: Optional[User] = Relationship(back_populates="votes")
    decision: Optional[Decision] = Relationship(back_populates="votes")

class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    decision_id: int = Field(foreign_key="decision.id")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional[User] = Relationship(back_populates="comments")
    decision: Optional[Decision] = Relationship(back_populates="comments")
    likes: List["CommentLike"] = Relationship(back_populates="comment")

class CommentLike(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    comment_id: int = Field(foreign_key="comment.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional[User] = Relationship(back_populates="comment_likes")
    comment: Optional[Comment] = Relationship(back_populates="likes")
