from fastapi import FastAPI
from fastapi import HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import engine
from app.routers import auth, contributions, cycle, groups, members, notifications, password_reset, rotation

app = FastAPI(title="NjangiBook API")

# Expo Go is a native client and does not enforce browser CORS.  The wildcard
# keeps local web testing simple; Settings rejects it when APP_ENVIRONMENT is
# production, where explicit browser origins are required.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials="*" not in settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database schema changes are deliberate and versioned.  Apply them before
# starting the API with: .\.venv\Scripts\python.exe -m alembic upgrade head

app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(contributions.router)
app.include_router(rotation.router)
app.include_router(members.router)
app.include_router(cycle.router)
app.include_router(password_reset.router)
app.include_router(notifications.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "NjangiBook API"}


@app.get("/health")
def health():
    """Deployment-safe liveness and database-readiness check."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable",
        ) from error
    return {"status": "ok", "database": "ok"}
