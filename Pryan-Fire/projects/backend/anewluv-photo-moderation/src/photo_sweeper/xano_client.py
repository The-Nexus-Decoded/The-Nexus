from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEFAULT_ENV_PATH = Path("/data/Workspace/Anewluv/.env")
AI_ACTOR_TYPE = "ai_agent"
TOKEN_TTL_SECONDS = 24 * 60 * 60


class XanoClientError(RuntimeError):
    pass


class XanoRaceSkip(XanoClientError):
    """Raised when Xano reports the photo is no longer in the expected status."""


@dataclass
class XanoConfig:
    api_base_url: str
    auth_api_base_url: str | None
    actor_key: str
    worker_jwt: str | None = None
    worker_email: str | None = None
    worker_password: str | None = None
    actor_type: str = AI_ACTOR_TYPE
    env_path: Path = DEFAULT_ENV_PATH

    @classmethod
    def from_env(cls, env_path: Path = DEFAULT_ENV_PATH) -> "XanoConfig":
        env = load_env_file(env_path)
        merged = {**env, **os.environ}
        actor_type = (merged.get("ANEWLUV_MODERATION_ACTOR_TYPE") or AI_ACTOR_TYPE).strip()
        if actor_type != AI_ACTOR_TYPE:
            raise XanoClientError(f"ANEWLUV_MODERATION_ACTOR_TYPE must be {AI_ACTOR_TYPE!r}")
        api_base_url = _require(merged, "ANEWLUV_API_BASE_URL").rstrip("/")
        actor_key = _first_present(
            merged,
            "ANEWLUV_MODERATION_ACTOR_KEY",
            "ANEWLUV_AI_ACTOR_KEY",
            "XANO_ACTOR_KEY",
            "moderation_service_key",
        )
        if not actor_key:
            raise XanoClientError("missing moderation actor key env")
        auth_api_base_url = (merged.get("ANEWLUV_AUTH_API_BASE_URL") or "").rstrip("/") or _default_auth_base(api_base_url)
        return cls(
            api_base_url=api_base_url,
            auth_api_base_url=auth_api_base_url,
            actor_key=actor_key,
            worker_jwt=_first_present(merged, "ANEWLUV_WORKER_JWT", "ANEWLUV_WORKER_TOKEN", "XANO_JWT"),
            worker_email=_first_present(merged, "ANEWLUV_WORKER_EMAIL", "DEVON_AGENT_EMAIL"),
            worker_password=_first_present(merged, "ANEWLUV_WORKER_PASSWORD", "DEVON_AGENT_PASSWORD"),
            actor_type=actor_type,
            env_path=env_path,
        )


def load_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            values[key] = value
    return values


def _require(values: dict[str, str], key: str) -> str:
    value = values.get(key)
    if not value:
        raise XanoClientError(f"missing required env {key}")
    return value


def _first_present(values: dict[str, str], *keys: str) -> str | None:
    for key in keys:
        value = values.get(key)
        if value:
            return value
    return None


def _default_auth_base(api_base_url: str) -> str | None:
    parsed = urllib.parse.urlparse(api_base_url)
    if not parsed.scheme or not parsed.netloc:
        return None
    return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, "/api:X_P2XjJo", "", "", ""))


class TokenCache:
    def __init__(self) -> None:
        self._token: str | None = None
        self._expires_at = 0.0

    def get(self) -> str | None:
        if self._token and time.time() < self._expires_at:
            return self._token
        return None

    def set(self, token: str, ttl_seconds: int = TOKEN_TTL_SECONDS) -> None:
        self._token = token
        self._expires_at = time.time() + ttl_seconds


class XanoModerationClient:
    def __init__(self, config: XanoConfig, *, timeout_seconds: int = 30, token_cache: TokenCache | None = None) -> None:
        self.config = config
        self.timeout_seconds = timeout_seconds
        self.token_cache = token_cache or TokenCache()

    def queue(self, *, page: int = 1, per_page: int | None = None, limit: int | None = None) -> dict[str, Any]:
        query = self._actor_params()
        query["page"] = str(page)
        if per_page is not None:
            query["per_page"] = str(per_page)
        elif limit is not None:
            query["per_page"] = str(limit)
        return self._request("GET", "/photos/queue", query=query)

    def moderation_settings(self) -> dict[str, Any]:
        return self._request("GET", "/moderation/settings", query=self._actor_params())

    def reason_codes(self, *, surface: str = "photo") -> dict[str, Any]:
        query = self._actor_params()
        query["surface"] = surface
        return self._request("GET", "/moderation/reason_codes", query=query)

    def review_items(self, *, applies_to: str = "photo") -> dict[str, Any]:
        query = self._actor_params()
        query["applies_to"] = applies_to
        return self._request("GET", "/moderation/review_items", query=query)

    def ai_decide(self, payload: dict[str, Any]) -> dict[str, Any]:
        body = {**payload, **self._actor_params()}
        return self._request("POST", "/photos/ai_decide", body=body)

    def escalation_open(self, payload: dict[str, Any]) -> dict[str, Any]:
        body = {**payload, **self._actor_params()}
        return self._request("POST", "/photos/escalations/open", body=body)

    def _actor_params(self) -> dict[str, str]:
        return {"actor_key": self.config.actor_key, "actor_type": self.config.actor_type}

    def _jwt(self) -> str:
        cached = self.token_cache.get()
        if cached:
            return cached
        if self.config.worker_jwt:
            self.token_cache.set(self.config.worker_jwt)
            return self.config.worker_jwt
        if not (self.config.auth_api_base_url and self.config.worker_email and self.config.worker_password):
            raise XanoClientError("missing worker JWT or login env")
        token = self._login()
        self.token_cache.set(token)
        return token

    def _login(self) -> str:
        assert self.config.auth_api_base_url is not None
        payload = {"email": self.config.worker_email, "password": self.config.worker_password}
        raw = self._raw_request("POST", f"{self.config.auth_api_base_url}/auth/login", body=payload, auth=False)
        token = raw.get("authToken") or raw.get("auth_token") or raw.get("token") or raw.get("jwt")
        if not isinstance(token, str) or not token:
            raise XanoClientError("login response did not include auth token")
        return token

    def _request(self, method: str, path: str, *, query: dict[str, str] | None = None, body: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self.config.api_base_url}{path}"
        return self._raw_request(method, url, query=query, body=body, auth=True)

    def _raw_request(
        self,
        method: str,
        url: str,
        *,
        query: dict[str, str] | None = None,
        body: dict[str, Any] | None = None,
        auth: bool,
    ) -> dict[str, Any]:
        if query:
            url = f"{url}?{urllib.parse.urlencode(query)}"
        data = json.dumps(body or {}).encode("utf-8") if body is not None else None
        headers = {"Accept": "application/json"}
        if data is not None:
            headers["Content-Type"] = "application/json"
        if auth:
            headers["Authorization"] = f"Bearer {self._jwt()}"
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                return _decode_json(response.read())
        except urllib.error.HTTPError as exc:
            body = _read_error_body(exc)
            if exc.code == 409 or "expected_current_status" in body:
                raise XanoRaceSkip("expected_current_status mismatch") from exc
            raise XanoClientError(f"Xano {method} {urllib.parse.urlparse(url).path} returned HTTP {exc.code}") from exc
        except urllib.error.URLError as exc:
            raise XanoClientError(f"Xano {method} {urllib.parse.urlparse(url).path} failed: {exc.__class__.__name__}") from exc


def _read_error_body(exc: urllib.error.HTTPError) -> str:
    try:
        return exc.read(1000).decode("utf-8", errors="replace")
    except Exception:
        return ""


def _decode_json(raw: bytes) -> dict[str, Any]:
    if not raw:
        return {}
    parsed = json.loads(raw.decode("utf-8"))
    return parsed if isinstance(parsed, dict) else {"items": parsed}
