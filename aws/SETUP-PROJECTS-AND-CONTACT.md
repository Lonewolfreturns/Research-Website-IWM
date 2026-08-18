# IWM website — deploying the Projects page and the contact mailer

Two things to do in the AWS console. The frontend is already built and will pick
both up the moment they're live — no rebuild needed for the backend changes.

Lambda source: `aws/lambdas/cms/lambda_function.py` (v4).

---

## Step 1 — Create the projects table

Console → **DynamoDB** → *Tables* → **Create table**

| Field | Value |
|---|---|
| Table name | `iwm-projects` |
| Partition key | `id` — type **String** |
| Sort key | *(leave empty)* |
| Capacity mode | **On-demand** |

Same region as the other tables (`us-east-2`). The key is `id` because that's
what the shared `_create`/`_update`/`_delete` helpers already key on — projects
reuse them verbatim, which is why no new persistence code was needed.

---

## Step 2 — Deploy the Lambda

Console → **Lambda** → your CMS function → paste `aws/lambdas/cms/lambda_function.py`
over the editor contents → **Deploy**.

No new environment variables are required. `PROJECTS_TABLE` defaults to
`iwm-projects`; set it only if you named the table something else.

Check it worked:

```bash
curl -s https://<your-function-url>/api/projects
```

`[]` means the route is live and the table is empty. A 404 means the Lambda
didn't deploy. Until then the public page shows its "no projects yet" state
rather than an error, so there's no broken window during the rollout.

---

## Step 3 — Give the Lambda permission to send

The CMS Lambda's execution role was created with *basic Lambda permissions*,
which cover CloudWatch Logs and nothing else. DynamoDB and S3 work today because
that role was extended for them; SES has not been. Without this the send fails
with `AccessDenied` and the form returns "We couldn't send your message right
now" — even after the address is verified.

Console → **Lambda** → your CMS function → *Configuration* → *Permissions* →
click the **execution role** name (opens IAM) → *Add permissions* →
**Create inline policy** → *JSON* tab → paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

Name it `iwm-ses-send` → **Create policy**.

`ses:SendRawEmail` is the only action needed — the Lambda builds a MIME message
itself so it can carry the attachment, rather than using the simpler `SendEmail`.

---

## Step 4 — Sort out the sender and the recipient

In the SES **sandbox** (where every new account starts) *both* ends must be a
verified identity: the address you send **from**, and the address you send
**to**. Identities are per-region — these must exist in `us-east-2`, the region
this Lambda talks to.

Currently verified: `researchiwm@gmail.com`.

That address is a fine **sender**. It is not enough on its own, because the code
defaults `ADMIN_INBOX` to `gprice@dal.ca`, which is not verified — so the send
fails on the recipient.

### 4a. Set the sender

Lambda → *Configuration* → *Environment variables* → add:

| Key | Value |
|---|---|
| `MAIL_FROM` | `researchiwm@gmail.com` |

Without this, `MAIL_FROM` falls back to `ADMIN_INBOX`, i.e. an unverified
`gprice@dal.ca`, and SES rejects the message before it looks at the recipient.

### 4b. Pick how mail reaches gprice@dal.ca

**Option 1 — verify the address (free, immediate, needs Gordon).**
SES → *Identities* → **Create identity** → *Email address* → `gprice@dal.ca`.
AWS emails a confirmation link; Gordon has to click it. Once the status flips to
*Verified*, leave `ADMIN_INBOX` unset — the code default already points there.

**Option 2 — request production access (needs no one else, ~24h).**
SES → *Account dashboard* → **Request production access**. Out of the sandbox,
only the *sender* needs verifying and mail can go to any recipient. This is the
right end state regardless, because it also means future recipient changes don't
need a verification round-trip.

Until one of those is done, keep `ADMIN_INBOX` set to `researchiwm@gmail.com` so
the form works and nothing is lost.

### A note on sending from a gmail.com address

SES will send it — verification is all SES requires — but `gmail.com` publishes
SPF/DMARC records that don't authorize AWS to send on its behalf, so some
recipients will file it as spam. It's fine for getting this working. The durable
fix is to verify a **domain** you control in SES and set `MAIL_FROM` to
something like `noreply@yourdomain.ca`. The visitor's address sits in `Reply-To`
either way, so replies always go to the right person.

---

## Step 5 — Test the plumbing before involving anyone else

Prove the pipeline works while both ends are addresses you control, then switch
the recipient over. Env vars for the test:

| Key | Value |
|---|---|
| `MAIL_FROM` | `researchiwm@gmail.com` |
| `ADMIN_INBOX` | `researchiwm@gmail.com` |

Submit the contact form on the live site. It should land in that Gmail inbox
with the visitor's address in **Reply-To** and the originating page listed under
`Sent from:`.

Once that works, the only remaining variable is the recipient — so when you
switch `ADMIN_INBOX` to `gprice@dal.ca` (after Option 1 or 2 above), any failure
is a recipient problem and nothing else. Delete the `ADMIN_INBOX` variable
entirely to fall back to the `gprice@dal.ca` default baked into the code.

### When a send fails

The Lambda logs the real exception before returning its polite 502. Console →
**CloudWatch** → *Log groups* → `/aws/lambda/<your-function>` → newest stream,
and look for a line starting `SES ERROR:`. What it usually says:

| In the log | Cause |
|---|---|
| `AccessDenied` / `not authorized to perform: ses:SendRawEmail` | Step 3 was skipped |
| `Email address is not verified` | Step 4 not finished, or done in the wrong region |
| `MessageRejected` on the *From* address | `MAIL_FROM` isn't a verified identity |

The region trap is the common one: SES identities are per-region, and this
Lambda talks to SES in `us-east-2`. An address verified in `us-east-1` does
nothing for it.

---

## What "no third-party mail server" means here

Mail is composed inside your Lambda and handed to Amazon SES in your own AWS
account, which delivers it straight to Dalhousie's mail servers. Nothing passes
through a Gmail or Outlook mailbox, and there's no `mailto:` link that would
hand the message off to whatever mail client the visitor happens to have
installed. The visitor never learns the destination address either — the form
posts to your API, not to an inbox.

Dalhousie's own mail servers do receive the message at the end, which is
unavoidable: that is what `@dal.ca` means.

---

## Field reference for a project record

Written by the admin console (*Admin → Projects*), read by `/projects`:

| Field | Shown as |
|---|---|
| `title` | Heading |
| `summary` | The short note, in serif, directly under the title |
| `description` | What's being done — line breaks preserved |
| `images` | The pictures, in order — the first is the cover. Several get arrows to page through |
| `image_path` | Kept written to the first picture, for the admin table and older records |
| `status` | Ongoing / Completed / Planned badge |
| `year` | Next to the status |
| `people` | "Who works on it" |
| `partners` | "Who else is involved" |
| `funding` | "Funded by" |
| `sponsors` | "Sponsors & contributions" |
| `external_url` | Optional "Project page" button |
| `story` | The long-form story at `/projects/<id>` — see below |
| `display_order` | Sort order — controlled by the ↑/↓ buttons in the admin table |

Empty attribution fields are omitted from the page rather than rendered blank,
so a project with only a funder shows only "Funded by".

---

## The project story

Each project can carry a story that grows over time: the account of the work as
it happens, written a piece at a time rather than all at once. Visitors reach it
from **Read the full story** on the project card, at `/projects/<id>` — a real
address, so a story can be linked to and shared on its own.

**No Lambda change is needed for this.** `story` is an ordinary attribute on the
project record, and `_create`/`_update` already store and merge whatever JSON the
admin console sends. Projects written before stories existed simply have none,
and show no story link.

It is written under *Admin → Projects → Edit → The story*, as an ordered list of
blocks. Each block is a map with an `id`, a `type`, and the fields for that type:

| `type` | Fields | Shown as |
|---|---|---|
| `text` | `text` | A paragraph; blank lines are kept as paragraph breaks |
| `heading` | `text`, `date` | A section heading, optionally dated — this is what makes a story read as a log |
| `quote` | `text`, `attribution` | A pull quote |
| `image` | `paths`, `caption` | One picture at its own proportions; several become one frame with arrows |
| `video` | `path`, `caption` | An uploaded clip, played inline |
| `embed` | `url`, `caption` | A YouTube or Vimeo link, normalised to its embed form |
| `link` | `url`, `label`, `note` | A paper, dataset or partner page |
| `gallery` | `ids` | Figures picked from the gallery — **not** re-uploaded |

Two connections are drawn from data that is already there, so neither needs
maintaining separately:

- **People.** Every roster name appearing in `people` or `partners` is matched
  against `/team` and shown as a portrait beside the story, linking to that
  person's card. Spell names as they appear on the team page and they link
  themselves.
- **The gallery.** A `gallery` block references figures by their gallery `id`.

There is **no public gallery page** at present — it was withdrawn at the lab's
request. The collection, the admin tab and the `/gallery` endpoint are all
unchanged: the gallery is now the pool that project stories draw figures from,
and a figure reaches the site by being picked in a story. `frontend/src/pages/Gallery.jsx`
is still in the tree, unrouted, with a note at the top on how to restore it.

Blocks left empty are dropped when the project is saved rather than published
blank.
