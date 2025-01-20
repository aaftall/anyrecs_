import logging
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import RegisterTortoise
from contextlib import asynccontextmanager
from database.database import _get_db_config
from api.endpoints.auth import router as auth_router
from api.endpoints.tool_endpoint import router as tool_router


# Configure logging
logging.basicConfig(level=logging.INFO)

# Disable httpx logging
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("stripe").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with RegisterTortoise(
        app=app,
        config=_get_db_config(),
        generate_schemas=True,
        add_exception_handlers=True,
    ):
        yield


app = FastAPI(debug=True, lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3000",
        "http://localhost:8888",
        "https://app.appsquad.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(tool_router, prefix="/tool", tags=["tool"])

from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Access your secret key
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")