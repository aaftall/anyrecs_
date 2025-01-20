import pydantic

from schemas.tool import Tool
from schemas.user import UserPrivate


class AudioReview(pydantic.BaseModel):
    id: int

    tool: Tool
    user: UserPrivate

    audio_data: bytes
