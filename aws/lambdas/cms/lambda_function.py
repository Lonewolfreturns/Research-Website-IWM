"""
IWM CMS backend v4 — single-file AWS Lambda (Python 3.12), behind a Lambda Function URL.
Adds the Projects collection on top of v3.

New in v4:
  GET    /projects                  (public)  -> [project]
  POST   /admin/projects            (auth)    -> project
  PUT    /admin/projects/{id}       (auth)    -> project
  DELETE /admin/projects/{id}       (auth)    -> { ok }
  PUT    /admin/projects/reorder    (auth)    -> { ok }

      A project record carries: title, summary (the short note), description
      (what's being done), image_path, status, year, people (who works on it),
      partners (who else is involved), funding (who pays for it), sponsors
      (sponsors and in-kind contributions) and an optional external_url.
      Storage and ordering reuse the same generic helpers as team/publications,
      so there is no new persistence code — only a new table name.

From v3:
  POST   /contact   (public, multipart/form-data) -> { message }
      Accepts name, email, subject, message and an optional file attachment,
      then emails everything to the admin inbox via Amazon SES. Mail is sent
      from this AWS account straight to the recipient's mail servers — nothing
      is relayed through a third-party mailbox provider. The visitor's address
      is set as Reply-To so the admin can reply from their own mail client.

      ADMIN_INBOX defaults to gprice@dal.ca; set the env var to override.
      That address (and MAIL_FROM, if different) must be a verified identity in
      SES for the same region, or SES rejects the send.

Environment variables (required): ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET, MEDIA_BUCKET
Contact (optional): ADMIN_INBOX (default gprice@dal.ca),
                    MAIL_FROM (verified SES sender; defaults to ADMIN_INBOX),
                    CONTACT_SUBJECT_PREFIX (default "[IWM contact]")
Optional: TOKEN_TTL_SECONDS (default 43200), ALLOW_ORIGIN (default "*"),
          TEAM_TABLE / PUBLICATIONS_TABLE / GALLERY_TABLE / PROJECTS_TABLE / SETTINGS_TABLE
"""

import os
import re
import json
import time
import uuid
import hmac
import base64
import hashlib
from decimal import Decimal

from email.parser import BytesParser
from email.policy import default as _email_policy
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

import boto3

# ---- config ----
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "")
MEDIA_BUCKET = os.environ.get("MEDIA_BUCKET", "")
TOKEN_TTL_SECONDS = int(os.environ.get("TOKEN_TTL_SECONDS", "43200"))
ALLOW_ORIGIN = os.environ.get("ALLOW_ORIGIN", "*")
REGION = os.environ.get("AWS_REGION", "us-east-2")

# contact / SES
# Default recipient is the lab's own address; SES delivers to Dalhousie's mail
# servers directly from this account, with no third-party relay in between.
ADMIN_INBOX = os.environ.get("ADMIN_INBOX", "") or "gprice@dal.ca"
MAIL_FROM = os.environ.get("MAIL_FROM", "") or ADMIN_INBOX
CONTACT_SUBJECT_PREFIX = os.environ.get("CONTACT_SUBJECT_PREFIX", "[IWM contact]")
# practical ceiling for an attachment routed THROUGH the Lambda (Function URL ~6MB,
# base64 inflates ~33%); keep some headroom.
MAX_ATTACH_BYTES = int(os.environ.get("MAX_ATTACH_BYTES", str(4_500_000)))

TABLES = {
    "team": os.environ.get("TEAM_TABLE", "iwm-team"),
    "publications": os.environ.get("PUBLICATIONS_TABLE", "iwm-publications"),
    "gallery": os.environ.get("GALLERY_TABLE", "iwm-gallery"),
    "projects": os.environ.get("PROJECTS_TABLE", "iwm-projects"),
}
SETTINGS_TABLE = os.environ.get("SETTINGS_TABLE", "iwm-settings")
SETTINGS_ID = "site"

# Collections that share the generic ordered-CRUD handlers below.
ORDERED_ENTITIES = ("team", "publications", "projects")

_ddb = boto3.resource("dynamodb", region_name=REGION)
_s3 = boto3.client("s3", region_name=REGION)
_ses = boto3.client("ses", region_name=REGION)

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


# ---------- helpers ----------
def _cors():
    return {
        "Access-Control-Allow-Origin": ALLOW_ORIGIN,
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "content-type,authorization",
        "Access-Control-Max-Age": "3600",
    }


def _jsonable(o):
    if isinstance(o, Decimal):
        return int(o) if o % 1 == 0 else float(o)
    raise TypeError


def _resp(status, body):
    headers = {"Content-Type": "application/json"}
    headers.update(_cors())
    return {"statusCode": status, "headers": headers,
            "body": json.dumps(body, default=_jsonable)}


def _read_body(event):
    raw = event.get("body") or ""
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode("utf-8")
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        return {}


def _clean(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, list):
        return [_clean(v) for v in obj]
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    return obj


def _scan_all(table):
    out, resp = [], table.scan()
    out += resp.get("Items", [])
    while "LastEvaluatedKey" in resp:
        resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
        out += resp.get("Items", [])
    return out


def _num(v):
    return v if isinstance(v, (int, float, Decimal)) else 0


# ---------- JWT (HS256, stdlib) ----------
def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _make_token(username: str) -> str:
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": username, "iat": now, "exp": now + TOKEN_TTL_SECONDS}
    s1 = _b64url(json.dumps(header, separators=(",", ":")).encode())
    s2 = _b64url(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(JWT_SECRET.encode(), f"{s1}.{s2}".encode(), hashlib.sha256).digest()
    return f"{s1}.{s2}.{_b64url(sig)}"


def _verify_token(token: str):
    try:
        s1, s2, s3 = token.split(".")
    except ValueError:
        return None
    expected = hmac.new(JWT_SECRET.encode(), f"{s1}.{s2}".encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(expected, _b64url_decode(s3)):
        return None
    try:
        payload = json.loads(_b64url_decode(s2))
    except Exception:
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return payload


def _authed(event):
    headers = event.get("headers") or {}
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if not auth.lower().startswith("bearer "):
        return None
    return _verify_token(auth[7:].strip())


# ---------- auth handlers ----------
def _login(event):
    data = _read_body(event)
    user = (data.get("username") or "").strip()
    pw = data.get("password") or ""
    if not (ADMIN_PASSWORD and JWT_SECRET):
        return _resp(500, {"detail": "server not configured"})
    if not (hmac.compare_digest(user, ADMIN_USERNAME) and hmac.compare_digest(pw, ADMIN_PASSWORD)):
        return _resp(401, {"detail": "invalid credentials"})
    return _resp(200, {"token": _make_token(user), "expiresIn": TOKEN_TTL_SECONDS})


# ---------- collection handlers ----------
def _list(entity):
    items = _scan_all(_ddb.Table(TABLES[entity]))
    items.sort(key=lambda x: _num(x.get("display_order")))
    return items


def _list_gallery():
    items = _scan_all(_ddb.Table(TABLES["gallery"]))
    items.sort(key=lambda x: _num(x.get("created_at")), reverse=True)
    return items


def _next_order(table):
    return max([_num(i.get("display_order")) for i in _scan_all(table)] + [0]) + 1


def _create(entity, event):
    table = _ddb.Table(TABLES[entity])
    data = _clean(_read_body(event))
    data["id"] = data.get("id") or uuid.uuid4().hex
    if not data.get("display_order"):
        data["display_order"] = _next_order(table)
    if entity == "publications":
        _enforce_pub_source(data)
    if entity == "projects":
        data.setdefault("created_at", int(time.time()))
    table.put_item(Item=data)
    return data


def _update(entity, item_id, event):
    table = _ddb.Table(TABLES[entity])
    existing = table.get_item(Key={"id": item_id}).get("Item") or {}
    patch = _clean(_read_body(event))
    patch.pop("id", None)
    merged = {**existing, **patch, "id": item_id}
    if entity == "publications":
        _enforce_pub_source(merged, patch)
    table.put_item(Item=merged)
    return merged


def _delete(entity, item_id):
    _ddb.Table(TABLES[entity]).delete_item(Key={"id": item_id})
    return {"ok": True, "deleted": item_id}


def _reorder(entity, event):
    table = _ddb.Table(TABLES[entity])
    for it in (_read_body(event).get("items") or []):
        iid, order = it.get("id"), it.get("display_order")
        if iid is None or order is None:
            continue
        table.update_item(
            Key={"id": iid},
            UpdateExpression="SET display_order = :o",
            ExpressionAttributeValues={":o": int(order)},
        )
    return {"ok": True}


def _enforce_pub_source(item, patch=None):
    """A publication has EITHER an external_url OR a file_path, never both."""
    src = patch if patch is not None else item
    if src.get("external_url"):
        item["file_path"] = ""
    elif src.get("file_path"):
        item["external_url"] = ""


# ---------- gallery handlers ----------
def _gallery_create(event):
    data = _read_body(event)
    item = {
        "id": uuid.uuid4().hex,
        "type": data.get("type") or "image",
        "file_path": data.get("file_path", ""),
        "caption": data.get("caption", ""),
        "created_at": int(time.time()),
    }
    _ddb.Table(TABLES["gallery"]).put_item(Item=item)
    return item


def _gallery_embed(event):
    data = _read_body(event)
    item = {
        "id": uuid.uuid4().hex,
        "type": "embed",
        "embed_url": data.get("embed_url", ""),
        "caption": data.get("caption", ""),
        "created_at": int(time.time()),
    }
    _ddb.Table(TABLES["gallery"]).put_item(Item=item)
    return item


# ---------- settings handlers ----------
def _get_settings():
    item = _ddb.Table(SETTINGS_TABLE).get_item(Key={"id": SETTINGS_ID}).get("Item") or {}
    item.pop("id", None)
    return item


def _put_settings(event):
    table = _ddb.Table(SETTINGS_TABLE)
    existing = table.get_item(Key={"id": SETTINGS_ID}).get("Item") or {}
    patch = _clean(_read_body(event))
    patch.pop("id", None)
    merged = {**existing, **patch, "id": SETTINGS_ID}
    table.put_item(Item=merged)
    out = dict(merged)
    out.pop("id", None)
    return out


# ---------- uploads ----------
def _presign(event):
    if not MEDIA_BUCKET:
        return _resp(500, {"detail": "media bucket not configured"})
    data = _read_body(event)
    filename = (data.get("filename") or "file").replace("/", "_").replace("\\", "_")
    content_type = data.get("contentType") or "application/octet-stream"
    folder = (data.get("folder") or "uploads").strip("/")
    key = f"{folder}/{uuid.uuid4().hex}-{filename}"
    upload_url = _s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": MEDIA_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=300,
    )
    public_url = f"https://{MEDIA_BUCKET}.s3.{REGION}.amazonaws.com/{key}"
    return _resp(200, {"uploadUrl": upload_url, "key": key,
                       "publicUrl": public_url, "contentType": content_type})


# ---------- contact (public) ----------
def _parse_multipart(event):
    """Parse multipart/form-data into (fields: dict, files: list)."""
    headers = event.get("headers") or {}
    ctype = headers.get("content-type") or headers.get("Content-Type") or ""
    raw = event.get("body") or ""
    body = base64.b64decode(raw) if event.get("isBase64Encoded") else raw.encode("utf-8")
    msg = BytesParser(policy=_email_policy).parsebytes(
        b"Content-Type: " + ctype.encode() + b"\r\n\r\n" + body
    )
    fields, files = {}, []
    if msg.is_multipart():
        for part in msg.iter_parts():
            if part.get_content_disposition() not in ("form-data", "attachment"):
                continue
            name = part.get_param("name", header="content-disposition")
            filename = part.get_filename()
            data = part.get_payload(decode=True)
            if filename:
                files.append({
                    "name": name,
                    "filename": filename,
                    "content_type": part.get_content_type(),
                    "data": data or b"",
                })
            else:
                fields[name] = (data or b"").decode("utf-8", "replace")
    return fields, files


def _contact_diagnose():
    """
    What SES actually sees, from inside the Lambda. Admin-only.

    Exists because a failing contact form gives the visitor a deliberately vague
    message, and the useful detail is buried in CloudWatch. This reports the
    three things that actually go wrong: wrong region, an address that isn't
    verified (note the check is case-sensitive), and sandbox limits.
    """
    out = {
        "region": REGION,
        "mail_from": MAIL_FROM,
        "admin_inbox": ADMIN_INBOX,
        "note": "identities must be verified in THIS region, and matching is case-sensitive",
    }

    try:
        quota = _ses.get_send_quota()
        out["send_quota"] = {
            "max_24h": quota.get("Max24HourSend"),
            "sent_last_24h": quota.get("SentLast24Hours"),
            "max_per_second": quota.get("MaxSendRate"),
        }
        # 200/day is the standard sandbox allowance.
        out["likely_sandbox"] = quota.get("Max24HourSend") == 200.0
    except Exception as e:
        out["send_quota_error"] = repr(e)

    try:
        wanted = [MAIL_FROM, ADMIN_INBOX]
        attrs = _ses.get_identity_verification_attributes(Identities=wanted)
        got = attrs.get("VerificationAttributes", {})
        out["identities"] = {
            addr: got.get(addr, {}).get("VerificationStatus", "NOT FOUND in this region")
            for addr in wanted
        }
    except Exception as e:
        out["identity_error"] = repr(e)

    try:
        # Everything SES knows about, so a case or region mismatch is obvious.
        out["all_verified_identities"] = _ses.list_identities().get("Identities", [])
    except Exception as e:
        out["list_identities_error"] = repr(e)

    return out


def _contact(event):
    if not ADMIN_INBOX or not MAIL_FROM:
        return _resp(500, {"detail": "Contact email is not configured on the server."})

    try:
        fields, files = _parse_multipart(event)
    except Exception:
        return _resp(400, {"detail": "Could not read the form submission."})

    name = (fields.get("name") or "").strip()
    email = (fields.get("email") or "").strip()
    subject = (fields.get("subject") or "").strip()
    message = (fields.get("message") or "").strip()
    page = (fields.get("page") or "").strip()

    if not name:
        return _resp(400, {"detail": "Please enter your name."})
    if not _EMAIL_RE.match(email):
        return _resp(400, {"detail": "Please enter a valid email address."})
    if not subject:
        return _resp(400, {"detail": "Please enter a subject."})
    if len(message) < 5:
        return _resp(400, {"detail": "Message should be at least 5 characters."})

    for f in files:
        if len(f["data"]) > MAX_ATTACH_BYTES:
            return _resp(400, {"detail": "Attachment is too large to email — please keep it under ~4MB."})

    msg = MIMEMultipart()
    msg["Subject"] = f"{CONTACT_SUBJECT_PREFIX} {subject}".strip()
    msg["From"] = MAIL_FROM
    msg["To"] = ADMIN_INBOX
    msg["Reply-To"] = email

    body = (
        "New message from the website contact form\n"
        f"{'-' * 42}\n"
        f"Name:    {name}\n"
        f"Email:   {email}\n"
        f"Subject: {subject}\n"
    )
    if page:
        body += f"Sent from: {page}\n"
    body += f"\n{message}\n"
    msg.attach(MIMEText(body, "plain", "utf-8"))

    for f in files:
        part = MIMEApplication(f["data"])
        part.add_header("Content-Disposition", "attachment", filename=f["filename"])
        if f.get("content_type"):
            part.replace_header("Content-Type", f["content_type"])
        msg.attach(part)

    try:
        _ses.send_raw_email(
            Source=MAIL_FROM,
            Destinations=[ADMIN_INBOX],
            RawMessage={"Data": msg.as_bytes()},
        )
    except Exception as e:
        print("SES ERROR:", repr(e))
        return _resp(502, {"detail": "We couldn't send your message right now. Please try again later."})

    return _resp(200, {"message": "Thank you — your message has been sent."})


# ---------- entry point ----------
def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/") or "/"
    if path.startswith("/api/"):
        path = path[4:]
    elif path == "/api":
        path = "/"
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]

    if method == "OPTIONS":
        return {"statusCode": 204, "headers": _cors(), "body": ""}

    parts = [p for p in path.split("/") if p]

    try:
        # ---- auth ----
        if path == "/auth/login" and method == "POST":
            return _login(event)
        if path == "/auth/logout" and method == "POST":
            return _resp(200, {"ok": True})
        if path == "/auth/me" and method == "GET":
            claims = _authed(event)
            if not claims:
                return _resp(401, {"detail": "unauthorized"})
            return _resp(200, {"ok": True, "sub": claims.get("sub")})

        # ---- contact (public) ----
        if path == "/contact" and method == "POST":
            return _contact(event)

        # ---- admin guard ----
        is_admin = parts[:1] == ["admin"]
        if is_admin and not _authed(event):
            return _resp(401, {"detail": "unauthorized"})

        # ---- public reads ----
        if method == "GET" and parts == ["team"]:
            return _resp(200, _list("team"))
        if method == "GET" and parts == ["publications"]:
            return _resp(200, _list("publications"))
        if method == "GET" and parts == ["projects"]:
            return _resp(200, _list("projects"))
        if method == "GET" and parts == ["gallery"]:
            return _resp(200, _list_gallery())
        if method == "GET" and parts == ["settings"]:
            return _resp(200, _get_settings())

        # ---- presign ----
        if is_admin and parts[1:] == ["uploads", "presign"] and method == "POST":
            return _presign(event)

        # ---- settings write ----
        if is_admin and parts[1:] == ["settings"] and method == "PUT":
            return _resp(200, _put_settings(event))

        # ---- team / publications / projects writes ----
        for entity in ORDERED_ENTITIES:
            if is_admin and parts[1:2] == [entity]:
                rest = parts[2:]
                if rest == ["reorder"] and method == "PUT":
                    return _resp(200, _reorder(entity, event))
                if not rest and method == "POST":
                    return _resp(200, _create(entity, event))
                if len(rest) == 1 and method == "PUT":
                    return _resp(200, _update(entity, rest[0], event))
                if len(rest) == 1 and method == "DELETE":
                    return _resp(200, _delete(entity, rest[0]))

        # ---- gallery writes ----
        if is_admin and parts[1:2] == ["gallery"]:
            rest = parts[2:]
            if rest == ["embed"] and method == "POST":
                return _resp(200, _gallery_embed(event))
            if not rest and method == "POST":
                return _resp(200, _gallery_create(event))
            if len(rest) == 1 and method == "PUT":
                return _resp(200, _update("gallery", rest[0], event))
            if len(rest) == 1 and method == "DELETE":
                return _resp(200, _delete("gallery", rest[0]))

        return _resp(404, {"detail": "not found", "path": path})
    except Exception as e:
        print("ERROR:", repr(e))
        return _resp(500, {"detail": "server error"})
