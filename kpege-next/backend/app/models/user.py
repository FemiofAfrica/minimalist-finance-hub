from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class UserBase(SQLModel):
    name: str
    nudge_time: str = Field(default="evening")
    timezone: str = Field(default="Africa/Lagos")
    status: str = Field(default="active")

class User(UserBase, table=True):
    phone: str = Field(primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_interaction: Optional[datetime] = None

class UserCreate(UserBase):
    phone: str

class UserRead(UserBase):
    phone: str
    created_at: datetime
    last_interaction: Optional[datetime]
