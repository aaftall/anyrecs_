import pydantic


class ToolCreate(pydantic.BaseModel):
    link: str

class Tool(ToolCreate):
    id: int
    category: str
    name: str
    logo: str
