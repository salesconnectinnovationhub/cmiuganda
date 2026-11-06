# Staging and release checklist

Run the automated checks on every pull request. Complete the staging checks
before production deployment; record the deployment URL, commit, date, and
operator in the release ticket. Do not copy production secrets into local files
or CI logs.

## Automated checks

- [ ] `npm ci` completes from the committed lockfile.
- [ ] `npm test` passes, including estimator calculation/validation tests and
      Chromium browser smoke tests.
- [ ] Review the GitHub Actions run for the commit being released.

## Staging configuration and migrations

- [ ] Confirm the Cloudflare Pages staging project serves the intended commit
      over HTTPS and deploys the `functions/` routes.
- [ ] Bind a staging D1 database as `DB` and a private staging R2 bucket as
      `CMS_MEDIA_BUCKET`; do not point staging at production data or media.
- [ ] Configure staging-only `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_CMS_AUD`,
      and, when reviews are enabled, `CF_ACCESS_AUD`. Configure explicit
      `CMS_EDITOR_EMAILS` and `CMS_APPROVER_EMAILS` allowlists.
- [ ] Configure staging `CMI_FROM_EMAIL` and `RESEND_API_KEY` using encrypted
      Cloudflare secrets. Confirm the sender domain is verified in Resend.
- [ ] Back up the staging D1 database before applying SQL.
- [ ] For a fresh database, apply `functions/cms-schema.sql` and
      `functions/reviews-schema.sql` when reviews are enabled.
- [ ] For an existing database, apply only the required upgrade scripts in
      order. Follow the settings migration instructions in
      `functions/README.md`; apply `functions/cms-resource-migration.sql` only
      when upgrading a database created before resource support. Do not run
      upgrade migrations against a fresh database unless their instructions
      require it.
- [ ] Confirm schema tables and indexes exist, then load CMS and reviews from
      the staging site without configuration errors.

## CMS access, content, and media

- [ ] Sign in as an editor: confirm drafts are visible/editable, draft saves
      succeed, and publish/archive controls are unavailable.
- [ ] Attempt publish, archive, and a live-record update directly through the
      staging API as the editor; each must be rejected server-side.
- [ ] Sign in as an approver: confirm draft publication, live updates, archive,
      revision history, and restoration work and are recorded in revisions/audit
      history.
- [ ] Upload a supported image and document. Confirm published media can be
      viewed/downloaded, draft media is not public, and invalid signatures,
      unsupported types, and files over 10 MB are rejected.
- [ ] Confirm uploaded objects remain in the private R2 bucket and public
      delivery is only through the CMS media endpoint.

## Public workflows and release record

- [ ] Confirm Cloudflare zone rate-limit rules cover `/api/contact` and
      `/api/interest`, and cover `POST /api/reviews` when method matching is
      available. Verify a threshold-crossing staging request receives HTTP 429
      without blocking normal review reads.
- [ ] Submit a staging contact form and an expression of interest with test
      details. Confirm each message arrives in the intended test inbox and
      appears as accepted in Resend activity; a 200 response alone is not proof
      of delivery.
- [ ] Submit a review, verify it appears publicly, then publish/edit a reply as
      the authorized review administrator and confirm unauthorized accounts
      cannot do so.
- [ ] Test the estimator quote handoff through the contact form and confirm
      the estimate summary is present and editable.
- [ ] Check the gallery at mobile and desktop widths; confirm responsive
      thumbnails load in supported formats and each card still opens its
      original full-resolution photo.
- [ ] Review browser console/network errors, mobile layout, critical links,
      and the deployed pages/functions after staging smoke tests.
- [ ] Record the staging test results, outstanding failures, D1 backup
      location, production approval, and rollback owner before production
      deployment.