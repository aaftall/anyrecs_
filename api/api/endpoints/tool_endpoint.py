import os

from services import tool_service
from api.dependencies import get_current_user
from schemas.user import User
from schemas.tool import Tool
from fastapi import APIRouter, Depends, Response, Request, status, UploadFile, File
from fastapi.responses import FileResponse
from schemas.tool import ToolCreate


router = APIRouter()


@router.post("/", response_model=Tool)
async def add_tool(tool_data: ToolCreate, current_user: User = Depends(get_current_user)):
    return await tool_service.add_tool(link=tool_data.link, user=current_user)


@router.delete("/{tool_id}")
async def remove_tool(tool_id: int, current_user: User = Depends(get_current_user)):

    await tool_service.remove_tool(id=tool_id, user=current_user)

    return


@router.get("/{tool_id}/review")
async def get_tool_review(tool_id: int, user_id: int, data: bool = False):

    review = await (await tool_service.get_audio_review(tool_id=tool_id, user_id=user_id)).to_schema()

    if data:
        return Response(content=review.audio_data, media_type="audio/mp3")

    del review.audio_data

    return review


@router.post("/{tool_id}/review")
async def add_tool(tool_id: int, audio: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    review = await (await tool_service.update_audio_review(tool_id=tool_id, audio=audio, user=current_user)).to_schema()

    del review.audio_data

    return review

