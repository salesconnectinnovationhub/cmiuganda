# Expression-of-interest email

The Cloudflare Pages Functions at `POST /api/interest` and `POST /api/contact`
send both public contact forms to `cmigroupuganda@gmail.com` through Resend.
They validate submitted fields on the server and return success only when the
email provider accepts the message.

## Cloudflare setup

1. Deploy this site as a Cloudflare Pages project attached to
   `https://cmigroupuganda.com`. Pages Functions must be enabled by deploying
   the `functions/` directory with the site.
2. Verify a sender domain in Resend, then configure the verified sender address
   as the `CMI_FROM_EMAIL` Pages environment variable. The submitted email is
   used as `Reply-To`; a Gmail address cannot be used as a Resend sender unless
   that address/domain is verified with Resend.
3. Add the Resend API key as the encrypted `RESEND_API_KEY` secret in the
   Cloudflare Pages project settings. Do not put this key in site files.
4. Deploy, then submit a real test form and confirm delivery in the recipient
   inbox and Resend activity before treating EOI routing as live.

The repository does not contain Cloudflare deployment configuration or
credentials, so deployment and delivery must be completed and verified in the
CMI Group Cloudflare and Resend accounts. The legacy PHP handlers have also
been pointed at the same inbox, but the public HTML forms now use the Cloudflare
Pages Functions.

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
3. Create an R2 bucket for CMS images and bind it to the Pages project using
   the binding name `CMS_MEDIA_BUCKET`. The CMS serves images through
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
   an invalid image type and an image larger than 5 MB are rejected.
7. Add records only after the business has approved the text, photos, and
   partner destinations. The CMS accepts JPEG, PNG, and WebP uploads up to
   5 MB; uploaded objects use generated keys and are not overwritten.
8. In the Business contact details collection, review the prefilled public
   contact details, save a draft, and have an approver publish them. Verify
   phone, email, WhatsApp, and office links across the public pages. This
   collection does not alter the form-delivery inbox.
9. After publishing and archiving a test item, verify its revision history and
   restore a previous version. Confirm a restored published version is public
   and that archived content remains private until a published revision is
   restored.

Until D1 is bound and both schemas are applied, CMS and review API calls return
explicit configuration errors. Existing hard-coded team/partner/service
content remains visible until at least one approved CMS record of that type is
published. Existing third-party review history is not migrated automatically.
Without the `CMS_MEDIA_BUCKET` binding, image upload and image delivery return
an explicit unavailable response. Keep the bucket private and serve public
images only through the CMS media endpoint.

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
- The dashboard history view shows the latest 100 revisions per item; restore
  actions are themselves recorded. D1 backups remain the recovery mechanism
  for database-wide loss or accidental deletion.
- Individual service copy, profiles, property cards, partner logos, and
  promotions are CMS-managed. Existing long-form page layouts/headlines remain
  in HTML until their copy is explicitly migrated into structured content.

Continue using YouTube embeds for hosted videos. Back up D1, export/import
existing reviews if they must be retained, and verify the deployment and
admin Access policy before handing the CMS to editors.
