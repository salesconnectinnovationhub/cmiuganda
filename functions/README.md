# Expression-of-interest email

## Same-site customer chat

`/chat.html` uses the Pages Function at `POST /api/chat` to open a conversation
and add visitor messages. Visitors receive a random bearer token; only its
SHA-256 digest is stored with the conversation. The token is retained in the
current browser session, while every new visitor message and every staff reply
also sends an email notification through the configured Resend sender.

Staff use `/admin/chat.html`. The page is expected to be covered by the existing
Cloudflare Access application for `/admin*`; the API independently verifies
the Cloudflare Access JWT against `CF_ACCESS_CMS_AUD` and allows only addresses
in `CMS_EDITOR_EMAILS` or `CMS_APPROVER_EMAILS`.

Before deploying chat:

1. Apply `functions/chat-schema.sql` to the D1 database bound to Pages as `DB`:
   `npx wrangler d1 execute <database-name> --remote --file=functions/chat-schema.sql`
2. Verify the Resend sender settings (`CMI_FROM_EMAIL` and `RESEND_API_KEY`)
   used for chat notifications. Chat messages are saved even if an email
   notification fails; the UI surfaces that failure.
3. Configure and test a Cloudflare rate-limit rule for `POST /api/chat`. Start
   with a per-IP threshold that permits a normal conversation (for example 20
   requests per 60 seconds) and returns HTTP 429 only after the threshold.
4. Verify the Access application protects `/admin/chat.html`, and test the
   inbox, visitor messages, staff replies, close/reopen status, and email
   notifications with test addresses before launch.

Chat history is stored in D1 until removed under an approved retention process;
no retention period or automated deletion policy is configured by this code.
Do not treat email delivery as guaranteed chat availability. Check the inbox and
Resend activity during launch verification.

The public website enquiry and interest forms open a prefilled `mailto:` draft
to `cmi.groupuganda@gmail.com` in the visitor's email app. The visitor must
review and send the draft; the website does not make a Cloudflare/API request or
send email automatically. This works without an email-provider account or
service fee, but relies on the visitor having an email app configured.

The Pages Functions at `POST /api/contact` and `POST /api/interest` remain
available as optional legacy server-side endpoints; the public HTML forms do
not call them. If these endpoints are used, they need Resend configuration.
The legacy PHP contact handlers use the same recipient.

If the legacy PHP handlers are deployed separately, configure
`CMI_SMTP_HOST`, `CMI_SMTP_USERNAME`, `CMI_SMTP_PASSWORD`, and
`CMI_SMTP_FROM_EMAIL` in that server's environment. They return HTTP 503 when
these settings are missing. Rotate any SMTP credentials previously stored in
source code; chat and optional legacy Pages endpoints use the Resend settings above.

## Public submission abuse controls

Review submissions require a same-origin header. The website's current contact
forms open a visitor-side email draft and do not submit data to an API. The
optional legacy contact and interest endpoints still validate same-origin
requests and submitted fields.

No Cloudflare IP/rate-limit rule or email API is needed for the current contact
forms. If the optional legacy endpoints remain enabled and are used, protect
them with an edge rate limit such as 5 requests per 60 seconds per source IP.
Since Pages Functions do not currently expose the Workers Rate Limiting API as
a Pages binding, any such rule is configured at the zone and is not deployed by
application code.

If the Cloudflare plan supports method matching and a second rule, separately
protect review writes with
`http.request.method eq "POST" and http.request.uri.path eq "/api/reviews"`,
count by source IP, and start with 5 requests per 60 seconds with a 60-second
block. Do not rate-limit the review path without distinguishing `POST` if the
plan supports it, because public review reads use the same path. Test the rule
on staging and confirm it returns HTTP 429 only after the threshold. If review
spam persists, consider adding Turnstile with server-side token verification.

## Cloudflare setup

1. Deploy this site as a Cloudflare Pages project attached to
   `https://cmigroupuganda.com` for features that use Pages Functions.
2. The public enquiry and interest forms need no Cloudflare email settings.
   Submit a test enquiry and confirm it opens a draft addressed to
   `cmi.groupuganda@gmail.com`; press Send in the email app to verify delivery.
3. If chat notifications or the optional legacy contact endpoints are enabled,
   verify a sender domain in Resend, configure the verified sender as
   `CMI_FROM_EMAIL`, and add `RESEND_API_KEY` as an encrypted Pages secret.
   Do not put this key in site files.

The repository does not contain Cloudflare deployment configuration or
credentials. The legacy PHP handlers have also been pointed at the same inbox,
but the public HTML forms use the visitor's email app rather than those handlers.

## Public reviews and admin replies

The reviews form and inline reply controls on `services.html` use Cloudflare
Pages Functions backed by D1. Public reviews are visible on the same page;
official CMI Group replies are rendered directly beneath their review. Only
the Cloudflare Access identity `cmigroupuganda@gmail.com` can publish or update
official replies. Reply text and review content are rendered as text, not HTML.

Before deploying:

1. Create a Cloudflare D1 database (for example `cmi-reviews`) and apply the
   schema: `npx wrangler d1 execute cmi-reviews --remote --file=functions/reviews-schema.sql`
   (use the database name created in Cloudflare).
2. Bind that database to the Pages project using the binding name `DB`.
3. Configure a Cloudflare Access application for
   `https://cmigroupuganda.com/api/reviews/admin*`, with an allow policy limited
   to `cmigroupuganda@gmail.com`.
4. Add the Access team's domain (for example `your-team.cloudflareaccess.com`)
   as `CF_ACCESS_TEAM_DOMAIN` and the application's Audience (AUD) tag as
   `CF_ACCESS_AUD` in the Pages environment. The Worker verifies the Access
   token signature, issuer, audience, expiry, and admin email itself.
5. Deploy the site and test public review submission, admin sign-in, reply
   publishing, reply editing, and display while signed out.

The existing review script used a remote PHP/MySQL service. The new Pages
Functions do not read that legacy database. Export and import any existing
reviews into D1 before switching the public review page if historical reviews
need to remain visible. D1 is not yet provisioned in this project, so these
review endpoints will return an explicit unavailable response until the
database binding and schema are configured.

## Property management and listings

The public page is `property-management.html`. It describes the property and
asset oversight, trustee support, and real-estate development/management
services already described on `services.html`. Contact actions use the
confirmed CMI Group phone numbers and inbox.

Listings are stored in Cloudflare D1 and edited through the CMS. The listing
collection is empty until CMI Group approves current listing details.

Listing fields:

- `id`: stable unique identifier.
- `title`, `type` (`Land`, `Residential`, `Commercial`, or `Rental`),
  `location`, `price`, and `status` (`Available`, `Reserved`, `Sold`, or
  `Rented`).
- `summary`, `features` (array of short strings), and `images` (array of
  approved site-relative paths or generated `cms-media/property/...` keys).
- `imageAlt` (optional accessible description), plus CMS publication status
  (`draft`, `published`, or `archived`).

## JavaScript CMS

The admin UI is at `/admin/`. It manages property listings, team profiles,
partner links, services, promotions, and one structured business-contact
settings record. Editors can save drafts; only configured approvers can
publish, modify live records, or archive content. Public endpoints return
published records only. CMS writes and media uploads are protected by a signed
Cloudflare Access identity check and the configured editor/approver allowlists,
in addition to the Access application for `/admin*`.

Each successful create, update, publish, and archive stores a content snapshot
in `cms_revisions`. The dashboard displays an item's revision history and lets
authorized staff restore an earlier draft or published version. Restoring a
published revision makes it live; restoring an archived snapshot does not
publish it. Archive keeps the item and its history, so an approver can restore
an earlier published revision to recover an archived listing.
Editors can view and restore draft revisions only; approvers can view the full
revision history.
The singleton business-contact settings record cannot be archived; update its
values or restore a revision instead.

The fixed `business-contact` settings record controls public `mailto:`, `tel:`,
WhatsApp, and office-address links on pages that load `assets/js/cms-public.js`.
The public email setting changes website links only. It does not change the
server-side contact-form delivery recipient, which remains configured in the
email function.

The public pages consume CMS content as follows:

- Property listings render on `property-management.html`.
- Team records replace the existing team grid when published records exist.
- Partner records appear as accessible, linked logos on the home/about pages.
- Service records appear in the CMS-managed services section.
- Active promotions display in a dismissible pop-up on pages that load
  `assets/js/cms-public.js`.

### Required Cloudflare setup

1. Create a Cloudflare D1 database and bind it to the Pages project as `DB`.
   The same database can hold reviews and CMS tables.
2. Apply the CMS schema:
   `npx wrangler d1 execute <database-name> --remote --file=functions/cms-schema.sql`
   Apply `functions/reviews-schema.sql` too if review replies are enabled.
   If the CMS schema was already deployed before the settings collection was
   added, first back up the database, apply `cms-schema.sql` to create the
   revisions table, then run
   `npx wrangler d1 execute <database-name> --remote --file=functions/cms-settings-migration.sql`
   to update the existing `cms_items` content-type constraint while preserving
   its records.
3. Create an R2 bucket for CMS uploads and bind it to the Pages project using
   the binding name `CMS_MEDIA_BUCKET`. The CMS serves images and published
   downloadable resources through
   `GET /api/cms-media?key=...`; the bucket itself does not need a public
   bucket URL.
4. Configure a Cloudflare Access application for
   `https://cmigroupuganda.com/admin*` and allow the staff who need CMS access.
   Set `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_CMS_AUD` to the team domain and
   audience tag for this application. The CMS API independently verifies token
   signature, issuer, audience, and expiry before checking the verified email
   against the role lists below. If reviews are enabled, keep their separate
   audience in `CF_ACCESS_AUD`.
5. Set the Pages environment variables `CMS_EDITOR_EMAILS` and
   `CMS_APPROVER_EMAILS` to comma-separated staff email addresses. Editors can
   upload images and create or update drafts only. Approvers can publish,
   update live content, and archive content. Use explicit allowlists; do not
   leave either role list empty if the CMS is intended to be available.
6. Deploy and open `https://cmigroupuganda.com/admin/`. Confirm editor access,
   upload a valid image, save a draft, and verify an editor cannot publish or
   change live content. Then sign in as an approver, review the draft, publish
   it, and confirm the public page renders the uploaded image. Also verify that
   an invalid image type and a file larger than 10 MB are rejected.
7. Add records only after the business has approved the text, photos, and
   partner destinations. The CMS accepts JPEG, PNG, and WebP images up to
   10 MB. Larger images are resized and compressed in the browser before
   upload. The Support resources collection accepts PDF and Microsoft Word,
   Excel, and PowerPoint documents up to 10 MB. Oversized documents are
   rejected with guidance to optimize them; they are not converted, to avoid
   changing document contents or layout. Uploaded objects use generated keys
   and are not overwritten.
8. In the Business contact details collection, review the prefilled public
   contact details, save a draft, and have an approver publish them. Verify
   phone, email, WhatsApp, and office links across the public pages. This
   collection does not alter the form-delivery inbox.

   The fixed `homepage` page record edits the public homepage headline, introductory
   copy, primary and secondary local-page links, and up to three project highlights
   with approved images, alt text, location, and summary. Drafts remain private;
   approvers can preview and publish the record. If it is absent or unavailable,
   the existing static homepage content remains visible.
9. After publishing and archiving a test item, verify its revision history and
   restore a previous version. Confirm a restored published version is public
   and that archived content remains private until a published revision is
   restored.

Until D1 is bound and both schemas are applied, CMS and review API calls return
explicit configuration errors. Existing hard-coded team/partner/service
content remains visible until at least one approved CMS record of that type is
published. Existing third-party review history is not migrated automatically.
Without the `CMS_MEDIA_BUCKET` binding, image/resource upload and delivery return
an explicit unavailable response. Keep the bucket private and serve public
images and published documents only through the CMS media endpoint.

If CMS is already deployed with the earlier content-type constraint, back up
the D1 database and run
`npx wrangler d1 execute <database-name> --remote --file=functions/cms-resource-migration.sql`
to add the `resource` content type while preserving existing CMS records.
For a database created before the settings migration, follow the settings
migration above first; its current version also includes the resource type.
For a fresh database, apply the current `cms-schema.sql` instead.

### Content fields

- **Properties:** name, type, location, displayed price, availability,
  summary, features, photos uploaded through the CMS or selected approved site
  images, and image description.
- **Team:** name, role, biography, photo uploaded through the CMS or selected
  approved site image, and display order.
- **Partners:** name, approved HTTPS destination, uploaded or approved logo,
  alt text, and order.
- **Promotions:** title/body, optional image/action link, start/end dates, and a
  dismissal frequency in days (1-365; defaults to 7). The start and end dates
  use the `Africa/Kampala` calendar. Both are inclusive, so an offer remains
  active through the end date in Uganda time. After a visitor dismisses a
  campaign, its popup stays dismissed across browser sessions for the configured
  number of elapsed 24-hour periods; the same campaign can appear again once
  that interval has passed, provided it has not expired.
- **Services:** title, summary, optional uploaded or approved photo, and order.
- **Business contact details:** one `business-contact` record containing the
  public email address, two phone numbers, WhatsApp link, and office addresses.
- **Homepage content:** one `homepage` record containing hero copy, safe local
   CTA links, and three structured project highlight slots.
- The dashboard history view shows the latest 100 revisions per item; restore
  actions are themselves recorded. D1 backups remain the recovery mechanism
  for database-wide loss or accidental deletion.
- Individual service copy, profiles, property cards, partner logos, promotions,
   and the homepage hero/highlights are CMS-managed. Other long-form page
   layouts/headlines remain in HTML until explicitly migrated.

## Privacy-conscious conversion analytics

The public site sends an allowlisted conversion event to `POST /api/analytics`
for consultation CTA clicks, accepted contact/interest forms, estimator
handoffs, phone/WhatsApp/chat clicks, payment starts, and visits to the payment
return page. Contact and interest submissions are counted only after the form
API returns success. The current PesaPal page has no verified transaction
callback, so `payment_return` means only that the return page loaded; it is not
proof of a completed or settled payment.

Events are stored in D1 as daily counts grouped by event and public page path.
No cookies, visitor identifiers, IP addresses, query strings, form contents, or
payment details are stored. Do Not Track and Global Privacy Control opt-outs
are honored by the browser tracker. Data is grouped by UTC calendar day. The
`/admin/analytics.html` report requires an authorized CMS approver identity and
shows totals for 7, 30, or 90 days.

Before enabling analytics in a Cloudflare environment, apply the schema to the
same D1 database bound as `DB`:

```bash
npx wrangler d1 execute <database-name> --remote --file=functions/analytics-schema.sql
```

The zone should also rate-limit `POST /api/analytics` to protect D1 write
capacity. Review aggregate counts weekly or monthly. To report verified payment
completions, first implement and validate PesaPal's server-to-server IPN/webhook
and reconcile its transaction status before emitting a separate confirmed
payment event; do not infer payment success from a browser redirect.

Continue using YouTube embeds for hosted videos. Back up D1, export/import
existing reviews if they must be retained, and verify the deployment and
admin Access policy before handing the CMS to editors.
