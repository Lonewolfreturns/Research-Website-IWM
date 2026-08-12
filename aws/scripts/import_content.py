"""
IWM — Bulk-load site content into the CMS
=========================================

Reads publications.json / team.json / projects.json (sitting next to this file)
and posts every entry to the CMS admin API. Publications are ordered by tier then
year so the waste-management work leads; team and projects keep the order they
appear in their file.

The collection is a required argument: an earlier version defaulted to
publications, so running the script bare silently imported them a second time.
Nothing runs unless you name it. `dedupe-publications` clears up duplicates if a
collection ever does get posted twice.

The password is taken from IWM_ADMIN_PASSWORD, else the PASSWORD constant below,
else a hidden prompt — in that order. It is exchanged once for a JWT and
discarded when the process exits. If you fill in PASSWORD, keep the file local.

USAGE
-----
    python import_content.py publications           # publications
    python import_content.py team                   # team members
    python import_content.py projects               # projects
    python import_content.py team --dry-run         # print, send nothing
    python import_content.py team --replace         # wipe that collection first
    python import_content.py dedupe-publications    # remove duplicate publications

Standard library only — no pip install required.

ENVIRONMENT
-----------
    API_BASE            default: the production Lambda Function URL
    IWM_ADMIN_USER      default: gprice@dal.ca (must match ADMIN_USERNAME on the Lambda)
    IWM_ADMIN_PASSWORD  optional; prompted for when absent
"""

import argparse
import getpass
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

# The Windows console defaults to cp1252, which mangles the en-dashes in this
# script's output and the accented names in the citations. Force UTF-8 where the
# runtime allows it, and degrade gracefully rather than crashing where it doesn't.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).parent

# collection -> (json file, key inside it, API route segment)
SOURCES = {
    "publications": ("publications.json", "publications", "publications"),
    "projects": ("projects.json", "projects", "projects"),
    "team": ("team.json", "team", "team"),
}
DEDUPE = "dedupe-publications"

TIER_NAMES = {
    1: "Core IWM — waste, biosolids, composting, recovery",
    2: "Emerging substances of concern from biosolids",
    3: "Adjacent soil science",
    4: "Other crops / sensing",
}

DEFAULT_API_BASE = (
    "https://zwgh5m3l5ko4d5xjcnuqcpfppa0duvde.lambda-url.us-east-2.on.aws/api"
)
API_BASE = os.environ.get("API_BASE", DEFAULT_API_BASE).rstrip("/")
# Must match ADMIN_USERNAME on the CMS Lambda. Note this is the login name, not
# a mailbox — it happens to look like an address.
USER = os.environ.get("IWM_ADMIN_USER", "gprice@dal.ca")

# ---------------------------------------------------------------------------
# Paste the admin password here to skip the prompt on every run. Keep this copy
# local — anything written here is plain text in the file, so don't commit it or
# pass the file around. Leave it empty to be asked instead.
PASSWORD = "G0rd0n@Pr1c3"
# ---------------------------------------------------------------------------



def call(method, route, token=None, body=None):
    """One JSON request. Raises RuntimeError with the server's message on failure."""
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API_BASE}{route}", data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:200]
        raise RuntimeError(f"{method} {route} -> {e.code} {detail}") from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"{method} {route} -> cannot reach API ({e.reason})") from None
    return json.loads(raw) if raw else {}


def authenticate():
    """Exchange the password for a JWT. The password is dropped immediately after."""
    # Environment beats the pasted constant, so a one-off run can override the
    # file without editing it; the prompt is the fallback when neither is set.
    password = (
        os.environ.get("IWM_ADMIN_PASSWORD")
        or PASSWORD
        or getpass.getpass(f'Password for "{USER}": ')
    )
    if not password:
        sys.exit("No password supplied. Set PASSWORD at the top of this file, "
                 "set IWM_ADMIN_PASSWORD, or type it at the prompt.")
    token = call("POST", "/auth/login", body={"username": USER, "password": password}).get("token")
    del password
    if not token:
        sys.exit("Login succeeded but returned no token.")
    print("authenticated")
    return token


def publication_records(rows, tiers=None):
    """Tier first, then newest within a tier — the order the site renders."""
    chosen = [p for p in rows if tiers is None or p["tier"] in tiers]
    chosen.sort(key=lambda p: (p["tier"], -p["year"]))
    return [
        {
            "title": p["title"],
            "authors": p["authors"],
            "year": p["year"],
            "venue": p["venue"],
            "abstract": "",
            "external_url": f"https://doi.org/{p['doi']}" if p.get("doi") else "",
            "file_path": "",
            "display_order": i + 1,
        }
        for i, p in enumerate(chosen)
    ]


def project_records(rows):
    return [
        {
            "title": p["title"],
            "summary": p.get("summary", ""),
            "description": p.get("description", ""),
            "status": p.get("status", ""),
            "year": p.get("year", ""),
            "people": p.get("people", ""),
            "partners": p.get("partners", ""),
            "funding": p.get("funding", ""),
            "sponsors": p.get("sponsors", ""),
            "external_url": p.get("external_url", ""),
            "image_path": p.get("image_path", ""),
            "display_order": i + 1,
        }
        for i, p in enumerate(rows)
    ]


def team_records(rows):
    """`group` is sent explicitly so the site never has to guess from role text."""
    return [
        {
            "name": m["name"],
            "role": m["role"],
            "bio": m.get("bio", ""),
            "group": m.get("group", ""),
            "alumni": bool(m.get("alumni")),
            "image_path": "",
            "website": "", "email": m.get("email", ""), "linkedin": "",
            "twitter": "", "github": "", "scholar": "", "facebook": "",
            "display_order": i + 1,
        }
        for i, m in enumerate(rows)
    ]


BUILDERS = {
    "publications": publication_records,
    "projects": project_records,
    "team": team_records,
}


def describe(what, r):
    if what == "team":
        return f"{r['name']} — {r['role'][:44]}{'  [alumni]' if r['alumni'] else ''}"
    if what == "projects":
        return f"[{r['status'] or '-'}] {r['title'][:64]}"
    tail = "" if r["external_url"] else "   (no link)"
    return f"[{r['year']}] {r['title'][:66]}{tail}"


def dedupe_publications(token, dry_run):
    """
    Remove duplicate publications, keeping one of each title.

    Matching is on the exact title, and the survivor is the copy with the lowest
    display_order so the curated tier ordering is preserved. Titles that appear
    only once are never touched.
    """
    rows = call("GET", "/publications")
    by_title = {}
    for p in rows:
        by_title.setdefault(p.get("title", ""), []).append(p)

    doomed = []
    for title, copies in by_title.items():
        if len(copies) < 2:
            continue
        copies.sort(key=lambda p: (p.get("display_order") or 0, str(p.get("id"))))
        doomed.extend(copies[1:])

    print(f"{len(rows)} publications, {len(by_title)} distinct titles, {len(doomed)} to remove")
    if not doomed:
        print("nothing to do")
        return
    if dry_run:
        for p in doomed[:10]:
            print(f"  would delete  order={p.get('display_order')}  {str(p.get('title'))[:58]}")
        if len(doomed) > 10:
            print(f"  ... and {len(doomed) - 10} more")
        print("\ndry run — nothing deleted")
        return

    removed = 0
    for p in doomed:
        try:
            call("DELETE", f"/admin/publications/{p['id']}", token)
            removed += 1
            print(f"  deleted {str(p.get('title'))[:60]}")
        except RuntimeError as e:
            print(f"  FAILED {str(p.get('title'))[:56]}\n    {e}", file=sys.stderr)
    print(f"\nremoved {removed}; {len(rows) - removed} publications remain")


def main():
    ap = argparse.ArgumentParser(description="Bulk-load team and projects into the IWM CMS.")
    # Required on purpose. This used to default to publications, so running the
    # script bare re-imported all 40 of them instead of doing what was intended.
    ap.add_argument("what", choices=sorted(SOURCES) + [DEDUPE],
                    help="which collection to import, or dedupe-publications to remove duplicates")
    ap.add_argument("--dry-run", action="store_true", help="print what would happen, change nothing")
    ap.add_argument("--replace", action="store_true", help="delete that collection's existing entries first")
    ap.add_argument("--allow-duplicates", action="store_true",
                    help="post every record even if one with the same name/title already exists")
    ap.add_argument("--tiers", nargs="+", type=int, metavar="N",
                    help="publications only: restrict to these tiers (1-4)")
    args = ap.parse_args()

    what = args.what
    print(f"target: {API_BASE}")
    print(f"user:   {USER}   (override with IWM_ADMIN_USER)")

    if what == DEDUPE:
        if args.dry_run:
            dedupe_publications(None, True)
            return
        dedupe_publications(authenticate(), False)
        return

    filename, key, route = SOURCES[what]
    data_path = HERE / filename
    if not data_path.exists():
        sys.exit(f"{filename} not found next to this script.")
    if args.tiers and what != "publications":
        sys.exit("--tiers only applies to publications.")

    db = json.loads(data_path.read_text(encoding="utf-8"))
    tiers = set(args.tiers) if args.tiers else None
    records = (
        publication_records(db[key], tiers) if what == "publications" else BUILDERS[what](db[key])
    )
    if not records:
        sys.exit(f"Nothing to import from {filename} — check the --tiers filter.")

    print(f"{len(records)} {what} from {filename}")
    if tiers:
        for t in sorted(tiers):
            print(f"  tier {t}: {TIER_NAMES.get(t, '?')}")
    if what == "publications":
        no_link = sum(1 for r in records if not r["external_url"])
        if no_link:
            print(f"note: {no_link} have no DOI and will show without a link")
    elif what == "team":
        print(f"note: {sum(1 for r in records if r['alumni'])} marked as alumni")

    # Skip anything already on the site unless told otherwise. Re-running should
    # be a no-op, not a way to end up with two of everything.
    skipped = []
    if not args.allow_duplicates and not args.replace:
        present = {
            str(p.get("title") or p.get("name") or "").strip().lower()
            for p in call("GET", f"/{route}")
        }
        keep = []
        for r in records:
            label = r.get("title") or r.get("name")
            (skipped if label.strip().lower() in present else keep).append(r)
        records = keep
        if skipped:
            print(f"note: {len(skipped)} already on the site, will be skipped:")
            for r in skipped:
                print(f"        {(r.get('title') or r.get('name'))[:66]}")
            print("      (--allow-duplicates to post them anyway, --replace to start clean)")
        if not records:
            print("\nnothing new to add")
            return

    if args.dry_run:
        print()
        for r in records:
            print(f"  {r['display_order']:02d}. {describe(what, r)}")
        print("\ndry run — nothing sent")
        return

    if args.replace:
        print(f"\n--replace will DELETE every existing entry in {what} before importing.")
        if input("Type 'replace' to confirm: ").strip() != "replace":
            sys.exit("Aborted.")

    token = authenticate()

    if args.replace:
        for p in call("GET", f"/{route}"):
            call("DELETE", f"/admin/{route}/{p['id']}", token)
            print(f"  deleted {str(p.get('title') or p.get('name'))[:60]}")

    ok, failed = 0, []
    for r in records:
        label = r.get("title") or r.get("name")
        try:
            call("POST", f"/admin/{route}", token, r)
            ok += 1
            print(f"  {r['display_order']:02d}/{len(records)} {label[:66]}")
        except RuntimeError as e:
            failed.append(label)
            print(f"  FAILED {label[:60]}\n    {e}", file=sys.stderr)

    print(f"\ndone — {ok}/{len(records)} posted")
    if failed:
        print(f"{len(failed)} failed; re-running is safe but will duplicate the ones that succeeded.")
        print("Use --replace to start from a clean slate instead.")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nCancelled.")
    except RuntimeError as exc:
        # Login and delete failures land here. The message already says what
        # broke, so print that rather than a traceback.
        sys.exit(f"\n{exc}")
