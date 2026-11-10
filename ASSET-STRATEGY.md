# Asset and frontend structure

## Shared frontend code

- `assets/css/style.css` owns the shared design tokens and legacy theme rules.
- `assets/css/site-components.css` owns reusable conversion, FAQ, policy,
  project-case-study, and office-location components. Load it after
  `style.css` on pages that use those components.
- `assets/js/lead-form.js` owns the shared submission behavior for marked
  project enquiry forms. Form field names intentionally match
  `POST /api/contact`.
- Keep page-specific behavior in its existing page script; do not load scripts
  that have no matching page component.

The site is deployed as static HTML with Cloudflare Pages Functions. Its HTML
must remain complete in the deployed files; browser-fetched header/footer
partials would make essential navigation dependent on JavaScript and would
weaken static previews. If introducing HTML partials, use a build-time
preprocessor that emits plain HTML and verify that the Cloudflare Pages build
and Playwright test server both serve the generated output before migrating
existing pages.

## Media directories

- `assets/img/`: theme imagery, logos, and interface icons.
- `images/`: project, property, service, and product media used by public pages.
- `images/gallery-thumbnails/` and `galleryimages/thumbnails/`: generated
  gallery derivatives; keep source photographs separate from thumbnails.
- `galleryimages/`: source gallery images.
- `teamimages/` and `cmipics/`: team portraits and company-specific imagery.
- Cloudflare R2 CMS uploads are remote content keys, not files to move into
  these directories.
- `submit/`: legacy PHP form handling and its PHPMailer dependency. Current
  public forms use Cloudflare Pages Functions; retain the legacy files until
  the deployment owner confirms no separate PHP deployment depends on them.

## Safe asset cleanup

Run `npm run audit:assets` to list static files that have no recognizable
reference in source code or documentation. The report is deliberately
non-destructive: CMS database content, generated paths, and external runtime
references can make a file appear unused. Review each candidate against the
live CMS and deployment before deleting or moving it. Use root-relative paths
for public references where practical and preserve descriptive, accessible alt
text for meaningful images.
