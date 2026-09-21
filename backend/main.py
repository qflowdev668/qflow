from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError

from qflow_api.config import settings
from qflow_api.routers import admin, auth_routes, display, misc, queue, staff, status, user

REPO_ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = REPO_ROOT / "out"

app = FastAPI(
    title="QFlow API",
    description="QFlow — FastAPI backend and static frontend server",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Session-Expires-In"],
)


@app.middleware("http")
async def attach_session_expires_in(request: Request, call_next):
    """Expose remaining JWT lifetime so the client session banner stays accurate.

    Replaces the old Next.js proxy.ts refresh-side effect: FastAPI does not
    refresh tokens, but every Bearer request gets ``X-Session-Expires-In``.
    """
    response = await call_next(request)
    auth = request.headers.get("authorization") or ""
    if auth.startswith("Bearer "):
        from qflow_api.auth import jwt_exp_unverified
        import time

        token = auth.removeprefix("Bearer ").strip()
        exp = jwt_exp_unverified(token)
        if exp is not None:
            remaining = max(0, int(exp) - int(time.time()))
            response.headers["X-Session-Expires-In"] = str(remaining)
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        content = exc.detail
    else:
        content = {"error": exc.detail}
    return JSONResponse(status_code=exc.status_code, content=content)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"error": "Invalid request."})

app.include_router(staff.router)
app.include_router(queue.router)
app.include_router(status.router)
app.include_router(auth_routes.router)
app.include_router(admin.router)
app.include_router(user.router)
app.include_router(display.router)
app.include_router(misc.router)


@app.get("/health")
async def health() -> dict:
    configured = bool(settings.supabase_url and settings.supabase_anon_key)
    static_built = STATIC_DIR.is_dir() and any(STATIC_DIR.iterdir())
    supabase_host = ""
    if settings.supabase_url:
        try:
            from urllib.parse import urlparse

            supabase_host = urlparse(settings.supabase_url).hostname or ""
        except Exception:
            supabase_host = ""
    return {
        "ok": True,
        "service": "qflow-api",
        "supabaseConfigured": configured,
        "supabaseHost": supabase_host,
        "staticBuilt": static_built,
    }


def _resolve_static(path: str) -> Path | None:
    if not path or path == ".":
        index = STATIC_DIR / "index.html"
        return index if index.is_file() else None

    direct = STATIC_DIR / path
    if direct.is_file():
        return direct

    with_html = STATIC_DIR / f"{path.rstrip('/')}.html"
    if with_html.is_file():
        return with_html

    index_in_dir = STATIC_DIR / path.rstrip("/") / "index.html"
    if index_in_dir.is_file():
        return index_in_dir

    return None


def _exported_page_redirect(full_path: str) -> str | None:
    """Map real location ids onto the only prerendered static pages (`/_/`)."""
    parts = [p for p in full_path.split("/") if p]
    if not parts or parts[0] == "_next":
        return None

    if parts[0] == "location" and len(parts) >= 2 and parts[1] != "_":
        loc_id = parts[1]
        rest = parts[2:]
        if rest and rest[0] == "join":
            suffix = "/".join(rest[1:])
            if suffix:
                return f"/location/_/join/{suffix}"
            return f"/location/_/join/?id={quote(loc_id)}"
        suffix = "/".join(rest)
        if suffix:
            return f"/location/_/{suffix}"
        return f"/location/_/?id={quote(loc_id)}"

    if parts[0] == "display" and len(parts) >= 2 and parts[1] != "_":
        rest = parts[2:]
        suffix = "/".join(rest)
        if suffix:
            return f"/display/_/{suffix}"
        return f"/display/_/?id={quote(parts[1])}"

    return None


if STATIC_DIR.is_dir() and any(STATIC_DIR.iterdir()):
    _static_ready = True
else:
    _static_ready = False


@app.get("/{full_path:path}", response_model=None)
async def serve_frontend(full_path: str) -> FileResponse | RedirectResponse:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    redirected = _exported_page_redirect(full_path)
    if redirected:
        return RedirectResponse(url=redirected, status_code=307)

    if not _static_ready:
        raise HTTPException(status_code=404, detail="Not found")

    resolved = _resolve_static(full_path)
    if resolved:
        return FileResponse(resolved)

    # Missing assets must 404 — SPA fallback of index.html makes browsers throw
    # "expected expression, got '<'" when an extension requests /script.js etc.
    asset_exts = (
        ".js",
        ".css",
        ".map",
        ".json",
        ".woff",
        ".woff2",
        ".ttf",
        ".eot",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".webp",
        ".ico",
        ".txt",
        ".xml",
        ".webmanifest",
    )
    lower = full_path.lower()
    if any(lower.endswith(ext) for ext in asset_exts):
        raise HTTPException(status_code=404, detail="Not found")

    fallback = STATIC_DIR / "index.html"
    if fallback.is_file():
        return FileResponse(fallback)

    raise HTTPException(status_code=503, detail="Frontend index missing.")
