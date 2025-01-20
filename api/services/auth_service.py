import os
import jwt
import logging
import requests

from database.models import User as UserModel
from pydantic import BaseModel
from schemas import user as user_schemas
from passlib.context import CryptContext
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status, Response, Request
from itsdangerous import URLSafeTimedSerializer, BadSignature
from services.email_service import send_confirmation_email, send_password_reset_email


ALGORITHM = "HS256"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") # generated with `openssl rand -hex 23
EMAIL_SALT = "email-confirmation-salt"
PASSWORD_RESET_SALT = "password-reset-salt"

ACCESS_TOKEN_EXPIRE_MINUTES = 30
VALIDATION_TOKEN_MAX_AGE = 60 * 60 * 24 * 7 # 7 days


serializer = URLSafeTimedSerializer(JWT_SECRET_KEY)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class CredentialsException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

class HTTPInvalidTokenError(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )



def get_hash(password):
    return pwd_context.hash(password)


async def get_user(
    id: int | None = None,
    email: str | None = None,
    url: str| None = None,
):

    if id is not None:
        return await UserModel.filter(id=id).first()

    if email is not None:
        return await UserModel.filter(email=email).first()

    if url is not None:
        return await UserModel.filter(url=url).first()

    raise RuntimeError("No parameter provided to search for user")


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        secure=True,  # Set to True if using HTTPS
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


async def get_current_user(token: str) -> UserModel:
    try:
        payload = jwt.decode(token.split()[1], JWT_SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            logging.info("No email found in token, returning 401.")
            raise CredentialsException()
    except jwt.InvalidTokenError:
        raise HTTPInvalidTokenError()

    user = await get_user(email=email)

    if user is None:
        logging.info("No user found with such email, returning 401.")
        raise CredentialsException()

    return user


def generate_and_send_confirmation_email(user: UserModel, request: Request):
    token = serializer.dumps(user.email, salt=EMAIL_SALT)
    verification_endpoint = f"https://{request.url.hostname}/auth/confirm/{token}"
    send_confirmation_email(
        email=user.email,
        verification_endpoint=verification_endpoint,
    )


def get_google_userinfo(google_access_token: str):

    response = requests.get(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        headers={"Authorization": f"Bearer {google_access_token}"},
        timeout=5,
    )

    if response.status_code != 200:
        logging.error(f"Failed to retrieve google user info: {response.status_code=} {response.text=}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="an error has occured")

    return response.json()


async def auth_google_callback(code: str, response: Response):
    token_url = "https://accounts.google.com/o/oauth2/token"

    data = {
        "code": code,
        "client_id": os.getenv('GOOGLE_CLIENT_ID'),
        "client_secret": os.getenv('GOOGLE_CLIENT_SECRET'),
        "redirect_uri": os.getenv('GOOGLE_REDIRECT_URI'),
        "grant_type": "authorization_code",
    }

    token_response = requests.post(token_url, data=data, timeout=5)

    if token_response.status_code != 200:
        logging.warning(f"Received non-200 status code on google callback: {token_response.status_code=} {token_response.text=}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect Google credentials")

    google_access_token = token_response.json().get("access_token")
    user_info = get_google_userinfo(google_access_token=google_access_token)

    # {
    #     'id': 'str',
    #     'email': 'str',
    #     'verified_email': bool,
    #     'name': 'str (full name)',
    #     'given_name': 'str (first name)',
    #     'family_name': 'str (last name)',
    #     'picture': 'str (url)'
    # }

    # Check if user exists, if not create a new user

    user = await get_user(email=user_info["email"])

    if user is None:
        user = await UserModel.create(
            url="-".join(user_info["name"].split()),
            username=user_info["name"],
            email=user_info["email"],
            picture=user_info["picture"],
        )


    # Create JWT access token
    jwt_token = create_access_token(data={
        "sub": user.email,
    })

    response = RedirectResponse(
        url=f"{os.getenv('APP_URL')}/auth/google/callback?token={jwt_token}&url={user.url}"
    )
    set_auth_cookie(response, jwt_token)

    return response



async def refresh_google_token(refresh_token):
    token_url = "https://accounts.google.com/o/oauth2/token"

    data = {
        "client_id": os.getenv('GOOGLE_CLIENT_ID'),
        "client_secret": os.getenv('GOOGLE_CLIENT_SECRET'),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    response = requests.post(token_url, data=data, timeout=5)

    if response.status_code != 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to refresh Google token")

    tokens = response.json()

    return {
        "access_token": tokens["access_token"],
        "expires_in": tokens["expires_in"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"])).isoformat()
    }


async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out"}


async def read_users_me(user: UserModel):
    user = await user.to_schema(include_tools=True)

    return user


async def confirm_user(user: UserModel, token: str):

    invalid_token_exception = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="The confirmation link is invalid or has expired."
    )

    if user.is_confirmed:
        return RedirectResponse(url=os.getenv("APP_URL"))

    try:
        email = serializer.loads(token, max_age=VALIDATION_TOKEN_MAX_AGE, salt=EMAIL_SALT)
    except BadSignature:
        logging.warning(f"User trying to validate invalide token {user.id=}")
        raise invalid_token_exception

    if user.email != email:
        logging.warning(f"User trying to validate email assigned to someone else {user.email=} {email=}")
        raise invalid_token_exception

    user.is_confirmed = True
    await user.save()

    return RedirectResponse(url="/")
