import logging

from schemas.user import User
from services import auth_service
from fastapi import Cookie, HTTPException, status


async def get_current_user(access_token: str = Cookie(None)) -> User:
    if not access_token:
        logging.info("User has no access_token, returning 401.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    return await auth_service.get_current_user(access_token)
