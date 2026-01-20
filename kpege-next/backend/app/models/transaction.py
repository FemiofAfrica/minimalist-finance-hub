from datetime import datetime, date
from typing import Optional
from decimal import Decimal
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field

class TransactionBase(SQLModel):
    amount: Decimal = Field(default=0.0, max_digits=12, decimal_places=2)
    description: str
    category: str
    subcategory: Optional[str] = None
    raw_input: Optional[str] = None
    source: str = Field(default="whatsapp")
    currency: str = Field(default="NGN")

class Transaction(TransactionBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_phone: str = Field(foreign_key="user.phone", index=True)
    transaction_date: date = Field(default_factory=date.today)
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class TransactionCreate(TransactionBase):
    user_phone: str

class TransactionRead(TransactionBase):
    id: UUID
    user_phone: str
    transaction_date: date
    logged_at: datetime
