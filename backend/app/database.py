from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

# SQLite needs this flag because, by default, it only allows the thread
# that created a connection to use it. FastAPI can handle a request on a
# different thread than the one that opened the connection, so we relax
# that check. Postgres doesn't need this and ignores it if present, so
# it's safe to leave in for when we switch later.
connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

engine = create_engine(settings.database_url, connect_args=connect_args)

# Each request gets its own Session (a workspace for talking to the DB).
# autocommit/autoflush are off so we control exactly when writes happen.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Every model class inherits from this. SQLAlchemy uses it to know which
# classes map to which tables.
Base = declarative_base()


def get_db():
    """
    FastAPI dependency: opens a DB session for the lifetime of one request
    and always closes it afterward, even if the request raises an error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
