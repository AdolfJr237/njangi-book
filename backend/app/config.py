from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central place for every setting the app needs. Values come from
    environment variables (or a .env file in dev). Nothing here is
    hardcoded, so the exact same code runs locally against SQLite and
    in production against Postgres -- only the DATABASE_URL value changes.
    """

    database_url: str = "sqlite:///./njangibook.db"
    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    app_environment: Literal["development", "production"] = "development"
    # Comma-separated when deployed, for example:
    # https://app.example.com,https://admin.example.com
    # Native Expo requests are not browser-CORS requests, so they do not need
    # their own origin here. The wildcard is intentionally development-only.
    cors_origins: str = "*"

    # "dev" logs the code to the console instead of sending a real SMS --
    # lets the whole reset flow be tested with no SMS provider account.
    # Set SMS_PROVIDER=orange in the environment to switch, once that
    # sender is actually implemented. Nothing else about this feature
    # changes when that switch happens.
    sms_provider: Literal["dev", "orange"] = "dev"
    orange_sms_client_id: str | None = None
    orange_sms_client_secret: str | None = None
    # Orange documents this generic Cameroon sender address for its all-
    # operators product. It is not a member's phone number.
    orange_sms_sender_address: str = "tel:+2370000"
    # Optional, but a recognised sender name builds trust in reset messages.
    orange_sms_sender_name: str | None = None

    # Firebase is now the password-recovery verification provider. Locally,
    # point FIREBASE_SERVICE_ACCOUNT_PATH at the ignored JSON key file. On
    # Render, provide FIREBASE_SERVICE_ACCOUNT_JSON as an encrypted env var
    # instead of shipping a JSON file with the source code.
    firebase_service_account_path: str | None = None
    firebase_service_account_json: str | None = None

    otp_ttl_minutes: int = 10
    # Minimum time between two reset requests for the SAME phone number --
    # stops someone re-triggering an SMS send every second.
    otp_cooldown_seconds: int = 60
    # Hard caps in a rolling hour, checked independently -- either one
    # tripping blocks the request. Per-phone catches one number being
    # targeted; per-IP catches one attacker spreading requests across
    # many numbers so no single number looks abused on its own.
    otp_max_per_phone_per_hour: int = 5
    otp_max_per_ip_per_hour: int = 10
    # A code dies after this many wrong guesses, regardless of whether
    # it's still within its 10-minute expiry.
    otp_max_verify_attempts: int = 5

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def reject_unsafe_production_defaults(self) -> "Settings":
        """Fail fast rather than accidentally deploying development settings."""
        if self.sms_provider == "orange" and (
            not self.orange_sms_client_id or not self.orange_sms_client_secret
        ):
            raise ValueError("SMS_PROVIDER=orange requires Orange SMS client credentials")

        if self.app_environment != "production":
            return self

        if self.database_url.startswith("sqlite"):
            raise ValueError("Production requires a PostgreSQL DATABASE_URL")
        if self.secret_key == "dev-secret-change-me" or len(self.secret_key) < 32:
            raise ValueError("Production SECRET_KEY must be a unique value of at least 32 characters")
        if not self.cors_origin_list or "*" in self.cors_origin_list:
            raise ValueError("Production CORS_ORIGINS must list explicit HTTPS origin(s), never *")
        if any(not origin.startswith("https://") for origin in self.cors_origin_list):
            raise ValueError("Production CORS_ORIGINS must use HTTPS origin(s)")
        if not self.firebase_service_account_path and not self.firebase_service_account_json:
            raise ValueError(
                "Production requires FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON "
                "for password recovery"
            )
        return self


settings = Settings()
