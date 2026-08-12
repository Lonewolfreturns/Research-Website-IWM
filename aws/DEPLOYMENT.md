# Deploying the IWM site to AWS on iwmresearch.net

Everything except the front end is already live. This document covers hosting the
built React app, putting it behind HTTPS, and moving `iwmresearch.net` from the
Wix site to it.

> **Domain name:** the domain is **iwmresearch.net** (with an *m*, for
> Innovative Waste Management). `iwsresearch.net` does not resolve — worth
> double-checking which one is in the Wix account before starting.

---

## 1. Short answers to the two questions

**Can the Wix-bought domain point at this site?** Yes. You do not need a new
domain. Keep the registration where it is and hand DNS over to AWS by changing
the nameservers in the Wix dashboard. Registration and DNS are separate things —
Wix stays the registrar (and keeps billing you for renewal), Route 53 answers the
queries. Step 6 covers it.

**Will anything break?** The Wix website stops serving the moment DNS switches.
Email will not break: `iwmresearch.net` currently has **no MX records and no TXT
records**, so no mail or domain verification depends on it. (Confirmed by direct
DNS lookup. Re-check before cutover if anyone has added email in the meantime.)

---

## 2. What is already running

| Piece | Where | Status |
|---|---|---|
| CMS API | Lambda + Function URL, `us-east-2` | Live |
| Data | DynamoDB — `iwm-team`, `iwm-publications`, `iwm-projects`, `iwm-gallery`, `iwm-settings` | Live |
| Uploads | S3 `iwm-media-truro` | Live |
| Contact email | SES `us-east-2`, from `researchiwm@gmail.com` to `gprice@dal.ca` | Live |
| **Front end** | **nothing yet** | **this document** |

The front end is a static bundle — HTML, CSS, JS. There is no server to run. It
goes in an S3 bucket with CloudFront in front for HTTPS and caching.

---

## 3. Decide these before you start

**Admin URL.** The admin lives at a secret path, defaulting to
`/x7k2-manage-9qp`. It is not linked from anywhere and `robots.txt` blocks it,
but it is in the public JavaScript bundle — anyone reading the source can find
it. It is obscurity, not security; the password is what actually protects it.
Set `REACT_APP_ADMIN_SECRET_PATH` to something of your own choosing at build
time and update `robots.txt` to match.

**Where the API lives.** Two options, both fine:

- **Simple** — leave the Lambda Function URL as it is. The browser calls it
  cross-origin. Requires CORS to stay permissive. Fewer moving parts.
- **Tidier (§9)** — serve `/api/*` through the same CloudFront distribution. No
  CORS at all, the Lambda URL never appears in public source, and everything is
  one origin. About five extra minutes of setup.

Start with Simple. Move to Tidier later if you want; it is a config change, not a
code change.

---

## 4. Build the front end

`REACT_APP_*` variables are **baked into the bundle at build time**, not read at
runtime. Changing `.env` after building does nothing — you must rebuild. This
catches people out constantly.

From `frontend/`:

```bash
npm install
```

Check `.env` holds the production API URL:

```
REACT_APP_BACKEND_URL=https://zwgh5m3l5ko4d5xjcnuqcpfppa0duvde.lambda-url.us-east-2.on.aws
REACT_APP_ADMIN_SECRET_PATH=your-chosen-secret-path
```

Then:

```bash
npm run build
```

You get a `build/` folder: `index.html`, `favicon`-ish assets, `robots.txt`, and
`static/` containing content-hashed JS and CSS. That folder is the whole website.

---

## 5. Host it

### 5a. S3 bucket

Console → **S3** → **Create bucket**.

| Field | Value |
|---|---|
| Name | `iwmresearch-site` (globally unique; any name works) |
| Region | `us-east-2` — same as everything else |
| Block Public Access | **leave all four ON** |
| Versioning | Enable (cheap insurance for a bad deploy) |

Do **not** enable "Static website hosting" and do **not** make the bucket public.
CloudFront reaches it privately via Origin Access Control, which is both safer
and required for the SPA routing trick below to behave.

Upload the *contents* of `build/` — so `index.html` sits at the bucket root, not
inside a `build/` folder.

### 5b. Certificate — in us-east-1, not us-east-2

**CloudFront only accepts certificates from `us-east-1`.** Switch the console
region to **N. Virginia (us-east-1)** before requesting it.

#### Why, given everything else is in us-east-2

CloudFront is a *global* service rather than a regional one. It has no presence
in us-east-2 to speak of — it runs from hundreds of edge locations worldwide, and
its control plane lives in us-east-1. When you attach a custom certificate,
CloudFront looks in us-east-1 ACM and nowhere else. A certificate issued in
us-east-2 simply will not appear in the dropdown, with no error explaining why.

This is worth being relaxed about, because the certificate is not a server:

- **Nothing else moves.** S3, Lambda, DynamoDB and SES all stay in us-east-2.
  Your data does not leave the region it is in now.
- **No latency cost.** The certificate is a signed record, not something requests
  travel through. CloudFront pushes it out to every edge location regardless of
  where it was issued — a visitor in Halifax is served from a Canadian edge
  either way.
- **No money.** Public ACM certificates are free in every region.
- **No extra maintenance.** Renewal is automatic as long as the DNS validation
  records stay in place.

The rule only bites for global services. Regional ones — an Application Load
Balancer, or a REGIONAL API Gateway endpoint — need the certificate in *their*
region, so those would want us-east-2. Since this site sits behind CloudFront,
us-east-1 is the one it needs.

If having a certificate in a second region bothers you at all, the Amplify route
in the appendix avoids the question: Amplify provisions and renews the
certificate for you, and you never touch ACM directly.

Console → **Certificate Manager** (in us-east-1) → **Request** → Public
certificate.

Domain names — add both:

```
iwmresearch.net
www.iwmresearch.net
```

Validation method: **DNS**. ACM gives you CNAME records to add. Add them in the
**Wix DNS panel** for now (Wix still runs DNS at this point). Status goes to
*Issued* within a few minutes once the records propagate.

> Leave these validation CNAMEs in place permanently — ACM re-checks them to
> auto-renew. Delete them and the certificate eventually expires.

### 5c. CloudFront distribution

Console → **CloudFront** → **Create distribution**.

**Origin**

| Field | Value |
|---|---|
| Origin domain | your S3 bucket (pick it from the list, not the website endpoint) |
| Origin access | **Origin access control settings (recommended)** → create a new OAC |
| Bucket policy | click **Copy policy** and paste it into the bucket's Permissions tab |

**Default cache behaviour**

| Field | Value |
|---|---|
| Viewer protocol policy | Redirect HTTP to HTTPS |
| Allowed methods | GET, HEAD |
| Cache policy | CachingOptimized |
| Compress objects | Yes |

**Settings**

| Field | Value |
|---|---|
| Alternate domain names (CNAMEs) | `iwmresearch.net` and `www.iwmresearch.net` |
| Custom SSL certificate | the ACM certificate from 5b |
| Default root object | `index.html` |

**Custom error responses — this part is not optional.**

The site uses client-side routing. `/team` and `/projects` are not files in the
bucket; S3 returns an error for them. Without these rules, every URL except the
home page 404s on refresh or when shared as a link.

Distribution → **Error pages** → create two:

| HTTP error code | Customize response | Response page path | HTTP response code |
|---|---|---|---|
| 403 Forbidden | Yes | `/index.html` | **200** |
| 404 Not Found | Yes | `/index.html` | **200** |

403 matters as much as 404: with OAC, S3 returns *403* for a key that does not
exist, not 404.

The app's own 404 page still works — React Router renders it for genuinely
unknown paths once `index.html` loads.

---

## 6. Caching — set this correctly or deploys look broken

CloudFront will cache `index.html` at the edge. If it serves a stale
`index.html`, that file points at *old* hashed JS filenames, and visitors keep
running old code long after you deploy. This is not hypothetical — it bit us
during development, and cost an hour chasing a bug that had already been fixed.

Two halves to the fix.

**Upload with the right headers.** `static/*` filenames contain a content hash,
so they can be cached forever; `index.html` must never be cached hard.

With the AWS CLI (`aws configure` once, if you have not):

```bash
aws s3 sync build/ s3://iwmresearch-site --delete --exclude "index.html" --exclude "*.html" --cache-control "public,max-age=31536000,immutable"
```

Then the HTML, with no-cache:

```bash
aws s3 sync build/ s3://iwmresearch-site --exclude "*" --include "*.html" --cache-control "no-cache,must-revalidate"
```

**Invalidate after every deploy:**

```bash
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

Doing it via the console instead: select the files, **Actions → Edit metadata**,
add `Cache-Control` by hand. Tedious but workable. The CLI is worth the install.

---

## 7. Test before touching DNS

CloudFront gives you a URL like `d111111abcdef8.cloudfront.net`. The site is
fully usable there while Wix keeps serving the real domain. Check:

- Home page loads; fonts and the logo appear
- **Navigate to /team, then hit refresh** — if this 404s, revisit the error pages in 5c
- Team groups expand; Publications paginate
- A project credit name links through to that person's team card
- Admin path loads and you can log in
- Submit the contact form and confirm the mail arrives
- Browser console is clean

Only move DNS once all of that passes.

---

## 8. DNS cutover

### 8a. Hosted zone in Route 53

Console → **Route 53** → **Hosted zones** → **Create hosted zone** →
`iwmresearch.net`, type **Public**.

AWS gives you four nameservers like `ns-123.awsdns-45.com`. Note them down.

Recreate any records the domain needs. Today that is nothing but the ACM
validation CNAMEs — the domain has no MX or TXT records — but check the Wix DNS
panel and copy across anything that has appeared since.

Then add the site records:

| Name | Type | Value |
|---|---|---|
| `iwmresearch.net` | **A — Alias** | Alias to CloudFront distribution |
| `www.iwmresearch.net` | **A — Alias** | Alias to the same distribution |

Alias records, not CNAMEs. A plain CNAME is illegal at the domain apex; Route 53
Alias is AWS's way around that, and it costs nothing to query.

### 8b. Point Wix at Route 53

Wix dashboard → **Domains** → `iwmresearch.net` → **Advanced** → **Update
nameservers** → choose "Use external nameservers" (wording varies) and enter the
four Route 53 nameservers.

**The Wix site stops serving at this point.** Propagation is usually minutes,
occasionally up to 48 hours. During the gap some visitors see Wix, some see the
new site — both work, so it is untidy rather than broken.

Verify:

```bash
nslookup -type=NS iwmresearch.net
```

When it lists `awsdns` servers instead of `wixdns`, the switch has landed.

> **Do not cancel the Wix subscription until the new site has been live for a
> week or two.** Keeping the registration is what makes rollback possible, and
> registration is usually a small part of the bill. If you do want to move
> registration to Route 53 later, that is a separate transfer — and note ICANN
> blocks transfers for 60 days after a domain is registered or transferred.

---

## 9. After cutover

**Tighten CORS.** `ALLOW_ORIGIN` on the Lambda is `*`, meaning any site can call
your API. Set it to `https://iwmresearch.net`. Test the contact form and the
admin afterwards — if either breaks, the origin string does not match exactly
(scheme and host must be precise, no trailing slash).

**Send mail from your own domain.** Contact mail currently goes out as
`researchiwm@gmail.com`. Gmail's SPF and DMARC records do not authorise AWS to
send on its behalf, so some recipients will treat it as spam. Now that you
control DNS: verify **the domain** `iwmresearch.net` in SES (`us-east-2`), add
the DKIM records it gives you to Route 53, then set `MAIL_FROM` to something like
`noreply@iwmresearch.net`. Replies still go to the visitor, because the form sets
`Reply-To`.

**Optional — serve the API from the same domain.** Add a second origin to the
distribution pointing at the Lambda Function URL, with a behaviour for `/api/*`:

| Field | Value |
|---|---|
| Path pattern | `/api/*` |
| Origin | the Lambda Function URL |
| Allowed methods | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE |
| Cache policy | **CachingDisabled** |
| Origin request policy | AllViewerExceptHostHeader |

Then rebuild with `REACT_APP_BACKEND_URL=` (empty). The app builds its API base
as `${REACT_APP_BACKEND_URL}/api`, so empty yields the relative `/api` — same
origin, no CORS, and the Lambda URL no longer appears in public source.

---

## 10. Deploying updates later

```bash
npm run build
```

then the two `aws s3 sync` commands from §6, then the invalidation. Content
changes — team, projects, publications, settings — go through the admin console
and need no deploy at all; they are read from DynamoDB at page load.

---

## 11. Running costs

Rough monthly figures for a site at this traffic level:

| Service | Cost |
|---|---|
| S3 storage + requests | a few cents |
| CloudFront | free tier covers 1 TB/month out; realistically $0 |
| Route 53 hosted zone | $0.50 flat |
| ACM certificate | free |
| Lambda, DynamoDB, SES | already in the free tier at this volume |

Call it **under a dollar a month**, plus whatever Wix charges for the domain
registration. SES is $0.10 per thousand emails after the free allowance.

---

## 12. If something goes wrong

| Symptom | Cause |
|---|---|
| `/team` 404s on refresh, home page fine | Custom error responses missing — §5c |
| Certificate not selectable in CloudFront | Issued in the wrong region; must be **us-east-1** |
| Deploy made no difference | Stale `index.html` — invalidate, and check Cache-Control (§6) |
| Contact form fails after cutover | `ALLOW_ORIGIN` does not match the new domain exactly |
| Admin login 401s | `ADMIN_USERNAME` / `ADMIN_PASSWORD` on the Lambda; the API returns the same 401 for a wrong username as a wrong password |
| Site loads, no data | Check the browser console for CORS errors; confirm the built bundle has the right `REACT_APP_BACKEND_URL` |
| Old Wix site still showing | DNS has not propagated; verify with `nslookup -type=NS` |

**Rollback:** set the Wix nameservers back to `ns14.wixdns.net` and
`ns15.wixdns.net`. The Wix site returns once DNS propagates. This works for as
long as you keep the Wix subscription — which is the reason not to cancel it
immediately.

---

## Appendix — the simpler alternative

If §5–§8 feel like more machinery than you want to maintain, **AWS Amplify
Hosting** does the same job with far fewer steps: it handles HTTPS, the SPA
rewrite rule, and the custom domain (including creating the Route 53 hosted zone)
through a wizard.

1. Console → **AWS Amplify** → **Deploy without Git provider**
2. Drag the `build/` folder in
3. **Hosting → Custom domain** → `iwmresearch.net` → follow the prompts
4. **Rewrites and redirects** → add: source `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`, target `/index.html`, type **200 (Rewrite)** — this is Amplify's equivalent of the error-page rules

Trade-offs: slightly more expensive at scale, less control over caching, and
redeploying means dragging a folder rather than running a command. For a site
this size, entirely reasonable — and you can move to CloudFront later without
touching the application code.
