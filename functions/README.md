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
  approved site-relative paths under `images/`, `img/`, or `propertyimages/`).
- `imageAlt` (optional accessible description), plus CMS publication status
  (`draft`, `published`, or `archived`).

## JavaScript CMS

The admin UI is at `/admin/`. It manages property listings, team profiles,
partner links, services, and promotions. Content can be
saved as a draft, published, or archived. Public endpoints return published
records only. All writes are protected by a signed Cloudflare Access identity
check for `cmigroupuganda@gmail.com`, in addition to the Access application
that should protect `/admin*`.

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
3. Configure a Cloudflare Access application for
   `https://cmigroupuganda.com/admin*`, allowing only
   `cmigroupuganda@gmail.com`. Set `CF_ACCESS_TEAM_DOMAIN` and
   `CF_ACCESS_CMS_AUD` to the team domain and audience tag for this application.
   The CMS API independently verifies token signature, issuer, audience,
   expiry, and admin email. If reviews are enabled, keep their separate Access
   audience in `CF_ACCESS_AUD`.
4. Deploy the site and open `https://cmigroupuganda.com/admin/`. Confirm
   access, create a draft listing, publish it, check the property page, then
   archive it and confirm it is no longer public.
5. Add records only after the admin has approved the text, photos, and
   partner destinations. Image paths are restricted to approved site folders.
   The UI references existing site images; upload management via R2 is not
   included yet.

Until D1 is bound and both schemas are applied, CMS and review API calls return
explicit configuration errors. Existing hard-coded team/partner/service
content remains visible until at least one approved CMS record of that type is
published. Existing third-party review history is not migrated automatically.

### Content fields

- **Properties:** name, type, location, displayed price, availability,
  summary, features, approved photos, and image description.
- **Team:** name, role, biography, approved photo, and display order.
- **Partners:** name, approved HTTPS destination, logo, alt text, and order.
- **Promotions:** title/body, optional image/action link, start/end dates, and a
  dismissal frequency in days (1-365; defaults to 7). The start and end dates
  use the `Africa/Kampala` calendar. Both are inclusive, so an offer remains
  active through the end date in Uganda time. After a visitor dismisses a
  campaign, its popup stays dismissed across browser sessions for the configured
  number of elapsed 24-hour periods; the same campaign can appear again once
  that interval has passed, provided it has not expired.
- **Services:** title, summary, optional photo, and order.
- Individual service copy, profiles, property cards, partner logos, and
  promotions are CMS-managed. Existing long-form page layouts/headlines remain
  in HTML until their copy is explicitly migrated into structured content.

For larger media libraries, add Cloudflare R2 uploads and store object keys in
D1. Continue using YouTube embeds for hosted videos. Back up D1, export/import
existing reviews if they must be retained, and verify the deployment and
admin Access policy before handing the CMS to editors.
