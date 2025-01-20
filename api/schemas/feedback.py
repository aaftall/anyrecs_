from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FeedbackCreate(BaseModel):
    from_employee_id: int
    to_employee_id: int
    content: str
    type: str
    status: str = 'pending'

class Feedback(FeedbackCreate):
    id: int
    date: datetime

class FeedbackUpdate(BaseModel):
    content: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None