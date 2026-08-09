"""
The one seam between "send a text message" and whichever provider
actually does it. Everything else in the app calls get_sms_sender()
and .send(...) -- it never knows or cares whether that ends up printing
to a terminal or hitting a real telco API. Swapping providers later is
setting SMS_PROVIDER=orange in the environment, not a code change
anywhere that calls this.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from threading import Lock
from urllib.parse import quote

import httpx

from app.config import settings


class SmsSender(ABC):
    @abstractmethod
    def send(self, phone_number: str, message: str) -> None: ...


class SmsDeliveryError(RuntimeError):
    """A provider failed. The caller decides what is safe to tell the user."""


class ConsoleSmsSender(SmsSender):
    """
    Dev implementation. Prints the message to the backend console
    instead of sending anything, so the whole OTP flow -- request,
    receive, verify, reset -- can be tested end to end with no SMS
    provider account and no per-message cost.
    """

    def send(self, phone_number: str, message: str) -> None:
        print(f"[DEV SMS] to {phone_number}: {message}")


class OrangeSmsSender(SmsSender):
    """
    Orange Cameroon all-operators implementation. Credentials remain on the
    FastAPI server; the mobile app never sees them. Orange OAuth tokens are
    cached only in this process until shortly before their one-hour expiry.
    That cache is transient provider plumbing, not ledger state: a restart
    simply obtains a fresh token and never changes user or group data.
    """

    token_url = "https://api.orange.com/oauth/v3/token"
    messaging_base_url = "https://api.orange.com/smsmessaging/v1/outbound"
    request_timeout_seconds = 15

    def __init__(self) -> None:
        self._access_token: str | None = None
        self._token_expires_at: datetime | None = None
        self._token_lock = Lock()

    def _get_access_token(self) -> str:
        now = datetime.now(timezone.utc)
        if self._access_token and self._token_expires_at and now < self._token_expires_at:
            return self._access_token

        with self._token_lock:
            now = datetime.now(timezone.utc)
            if self._access_token and self._token_expires_at and now < self._token_expires_at:
                return self._access_token

            try:
                response = httpx.post(
                    self.token_url,
                    auth=(settings.orange_sms_client_id or "", settings.orange_sms_client_secret or ""),
                    data={"grant_type": "client_credentials"},
                    headers={"Accept": "application/json"},
                    timeout=self.request_timeout_seconds,
                )
                response.raise_for_status()
                payload = response.json()
                access_token = payload.get("access_token")
                expires_in = int(payload.get("expires_in", 3600))
            except (httpx.HTTPError, ValueError, TypeError) as error:
                raise SmsDeliveryError("Orange authentication failed") from error

            if not isinstance(access_token, str) or not access_token:
                raise SmsDeliveryError("Orange authentication response did not include an access token")

            # Refresh one minute early, so a token does not expire during an
            # SMS request. Orange tokens normally last one hour.
            self._access_token = access_token
            self._token_expires_at = now + timedelta(seconds=max(0, expires_in - 60))
            return access_token

    def send(self, phone_number: str, message: str) -> None:
        access_token = self._get_access_token()
        sender_address = settings.orange_sms_sender_address
        request_url = f"{self.messaging_base_url}/{quote(sender_address, safe='')}/requests"
        outbound_request: dict[str, object] = {
            "address": f"tel:{phone_number}",
            "senderAddress": sender_address,
            "outboundSMSTextMessage": {"message": message},
        }
        if settings.orange_sms_sender_name:
            outbound_request["senderName"] = settings.orange_sms_sender_name

        try:
            response = httpx.post(
                request_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={"outboundSMSMessageRequest": outbound_request},
                timeout=self.request_timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise SmsDeliveryError("Orange SMS delivery request failed") from error


orange_sms_sender = OrangeSmsSender()


def get_sms_sender() -> SmsSender:
    if settings.sms_provider == "dev":
        return ConsoleSmsSender()
    if settings.sms_provider == "orange":
        return orange_sms_sender
    # Settings validates the allowed values at startup.  Keeping this guard
    # makes the safe behaviour explicit if another provider is added later.
    raise RuntimeError(f"Unsupported SMS provider: {settings.sms_provider}")
