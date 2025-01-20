def _get_db_config():
    return {
        "connections": {
            "default": {
                "engine": "tortoise.backends.sqlite",
                "credentials": {
                    "file_path": "db.sqlite3",
                }
            }
        },
        "apps": {
            "models": {
                "models": ["database.models"],
                "default_connection": "default",
            }
        }
    } 