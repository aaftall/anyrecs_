import os

from tortoise import Tortoise


def _get_db_config():
    POSTGRES_USER = os.getenv("POSTGRES_USER")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST")
    POSTGRES_PORT = int(os.getenv("POSTGRES_PORT"))
    POSTGRES_DB = os.getenv("POSTGRES_DB")

    if POSTGRES_USER is None:
        raise ValueError(f"POSTGRES_USER env variable is not defined")

    if POSTGRES_PASSWORD is None:
        raise ValueError(f"POSTGRES_PASSWORD env variable is not defined")

    if POSTGRES_HOST is None:
        raise ValueError(f"POSTGRES_HOST env variable is not defined")

    if POSTGRES_PORT is None:
        raise ValueError(f"POSTGRES_PORT env variable is not defined")

    if POSTGRES_DB is None:
        raise ValueError(f"POSTGRES_DB env variable is not defined")

    return {
    'connections': {
            'default': {
                'engine': 'tortoise.backends.asyncpg',
                'credentials': {
                    'host': POSTGRES_HOST,
                    'port': POSTGRES_PORT,
                    'user': POSTGRES_USER,
                    'password': POSTGRES_PASSWORD,
                    'database': POSTGRES_DB,
                }
            }
        },
        'apps': {
            'models': {
                'models': ['database.models'],
                # 'models': ['database.models', 'aerich.models'],
                'default_connection': 'default',
            }
        }
    }


async def init_db():

    await Tortoise.init(config=_get_db_config())

    # NOTE: do never use! Conflicting with aerich
    # https://github.com/tortoise/aerich/issues/324#issuecomment-1794095008
    # await Tortoise.generate_schemas()
