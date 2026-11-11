# CMI Group Uganda

CMI Group Uganda is a static marketing and lead-generation website for CMI Group Co. Ltd, a construction, property, and home-building company serving clients in Uganda and the diaspora. The repository combines a multi-page front-end with Cloudflare Pages Functions for contact handling, reviews, and a lightweight CMS so the company can manage public content without a traditional backend server.

## Project purpose

This project supports the public website for:

- construction and civil works
- building design and project execution
- property management and real estate services
- lead capture and enquiry handling
- public reviews and admin-managed content updates

The site is designed for Cloudflare Pages deployment and uses serverless functions to process form submissions and database-backed content.

## What this repo contains

- `index.html` and supporting HTML pages for home, about, services, projects, gallery, team, contact, and payment flow
- `assets/` for styling, images, fonts, and JavaScript shared by the site
- `assets/css/site-components.css` for reusable conversion and company-information components
- `ASSET-STRATEGY.md` for frontend structure and safe media cleanup guidance
- `admin/` for the content management dashboard
- `functions/` for Cloudflare Pages API endpoints and database schemas
- `images/`, `img/`, `galleryimages/`, `teamimages/`, `cmipics/` for website media
- `submit/` containing legacy PHP handlers and PHPMailer files; not used by the active Cloudflare Pages forms

## Main features and functionality

### 1. Corporate website and marketing pages
The main website presents CMI Group as a construction and property solutions company. Pages include:

- home and landing page
- about us
- services and specializations
- project and gallery pages
- team and company profiles
- contact and enquiry pages
- property management page
- payment and send-money flow
- company policy information at `policies.html`

The public company profile uses the documented founding year (2018), listed
Fort Portal and Kampala offices, and the Managing Director named on the team
page. Project snapshots intentionally distinguish published portfolio facts
from client briefs, timelines, warranties, and measured outcomes that have not
been supplied for publication. Review and approve the plain-language website
policy summary with qualified counsel before treating it as a complete legal
policy or contract.

These pages are mostly static HTML and are designed to be easy to update by a non-technical marketing/admin team.

### 2. Enquiry and contact forms
Public forms collect client details and send them by email via Cloudflare Pages Functions. The API handlers validate input length and format, block obvious spam fields, and send messages through Resend.

Key endpoints:

- `POST /api/contact` for general enquiries
- `POST /api/interest` for project expressions of interest
- server-side validation for email, phone, and message formatting
- spam honeypot protection using a hidden `website` field

### 3. Website chat
Visitors use the same-site `chat.html` page to create persistent conversations
and receive replies by email. Conversations and messages are stored in the
Cloudflare D1 database. Staff manage the inbox at `/admin/chat.html`, protected
by Cloudflare Access and the CMS editor/approver email allowlists. The visitor
interface polls for updates while open; messages are also sent through the
existing Resend email integration so conversations do not depend on a separate
chat service or the visitor keeping the browser tab open.

Apply `functions/chat-schema.sql` to the D1 database bound as `DB` before
enabling this feature. The chat needs the same verified Resend sender settings
as the contact forms. Apply a Cloudflare rate-limit rule to `POST /api/chat`
and verify the staff Access application protects `/admin/*`.

### 4. Review system
The site includes a public review form and a moderation/admin reply workflow.

- visitors submit ratings and comments
- review data is stored in Cloudflare D1
- admins can publish or edit replies
- public replies are rendered below each review
- review API is protected by Cloudflare Access checks for authorized admins

### 5. Content management system (CMS)
The admin dashboard in `admin/` lets authorized staff manage website content without editing HTML directly.

Managed content types include:

- homepage headline, introductory copy, calls to action, and project highlights
- property listings
- team members
- partner logos and links
- services
- promotions/announcements
- public business contact details

The system supports draft, publish, and archive states, approval roles, R2 image
uploads, previews, and per-item revision history with restore. Public endpoints
return only published content, while admin actions require verified identity
checks. A structured contact-settings record updates public phone, email,
WhatsApp, and office links without exposing arbitrary page HTML to editors.

The authorized admin dashboard also includes a privacy-conscious conversion
report. It stores daily aggregate counts by event and public page path, without
visitor IDs, cookies, query strings, form content, or IP addresses. Apply
`functions/analytics-schema.sql` to the bound D1 database before enabling it.

### 6. Property management and listings
The property-management page provides a public-facing property and asset oversight experience. Listing content can be managed through the admin CMS and stored in D1, with fields such as:

- title
- type
- location
- price
- status
- summary
- features
- approved image paths
- publication status

This allows CMI to maintain a clean property catalog without manually editing page templates.

### 7. Wall/block estimator
A standalone estimator lets visitors estimate masonry quantities for wall sections.

Features include:

- multiple wall entries
- optional opening deductions (doors/windows/other openings)
- unit dimensions and mortar joint input
- wall area calculations
- waste allowance handling
- final rounded-up unit count
- quote handoff into the contact form with a prefilled message

The estimator is a preliminary planning tool and clearly states that it is not a quotation or full bill of quantities.

### 8. Payments and contact actions
The repo includes payment-related pages such as `pay.html`, `payments.html`, and `pay.js`. These support customer payment flows and provide a way for visitors to send money or contact the company for billing and transaction inquiries.

### 9. Legacy and compatibility files
The project retains legacy PHP handlers and their PHPMailer dependency in
`submit/` for reference. Public forms use Cloudflare Pages Functions. The old
AJAX form script was removed because it was not needed and could duplicate the
contact-page request. Before removing or moving any other legacy files, confirm
that no separate PHP deployment depends on them.

Run `npm run audit:assets` to list likely unreferenced media for manual review.
The audit does not delete files and cannot infer references stored in the CMS or
other runtime data. See `ASSET-STRATEGY.md` before reorganizing media.

## Repository structure

```text
.
├── README.md
├── index.html
├── about.html
├── services.html
├── property-management.html
├── contact.html
├── pay.html
├── payments.html
├── block-estimator.html
├── project.html
├── gallery.html
├── team.html
├── success.html
├── cancel.html
├── comment.js
├── pay.js
├── admin/
│   ├── index.html
│   └── cms.js
├── assets/
│   ├── css/
│   ├── img/
│   ├── js/
│   └── fonts/
├── functions/
│   ├── README.md
│   ├── cms-schema.sql
│   ├── cms-settings-migration.sql
│   ├── reviews-schema.sql
│   ├── _shared/
│   └── api/
│       ├── cms.js
│       ├── cms-media.js
│       ├── cms-revisions.js
│       ├── contact.js
│       ├── interest.js
│       ├── reviews.js
│       └── reviews/
├── images/
├── img/
├── galleryimages/
├── teamimages/
├── cmipics/
├── submit/
└── data/
```

## Cloudflare Pages and runtime setup

This project is designed to run on Cloudflare Pages with Pages Functions enabled.

Required setup commonly includes:

- D1 database binding named `DB`
- `CMI_FROM_EMAIL` environment variable
- `RESEND_API_KEY` secret
- Cloudflare Access configuration for admin panels and review moderation
- deployment of the `functions/` directory with the main site

The `functions/README.md` file contains the operational deployment notes for
forms, reviews, CMS roles, revisions, contact settings, and the database
migration required when upgrading an existing CMS database.

## Local development

Because this is primarily a static site with serverless endpoints, local testing usually involves two parts:

1. Serve the front-end files locally:

```bash
cd "D:\cmi group\cmigroup"
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Do not open pages directly with `file://`. The public CMS uses `/api/cms`
endpoints, which are unavailable when serving static files with Python; run
the Cloudflare Pages preview below to test CMS-backed content locally.

2. For Cloudflare Functions, preview the site using Wrangler or deploy to Cloudflare Pages.

Example:

```bash
npx wrangler pages dev .
```

## How the backend works

The function handlers under `functions/api` perform the following roles:

- `contact.js`: validate and email general contact messages
- `interest.js`: validate and email project expression-of-interest submissions
- `reviews.js`: accept public ratings/comments, store them in D1, and serve admin/moderated replies
- `cms.js`: serve and manage structured content collections for the public site
- `cms-media.js`: authenticate image uploads and private R2 image delivery
- `cms-revisions.js`: list and restore audited CMS content snapshots

The shared logic and validation helpers live in `functions/_shared/`.

## Automated checks and release readiness

Run `npm ci` followed by `npm test` to execute estimator, Pages Function,
analytics, and CMS validation tests plus Chromium browser tests for estimator
handoffs, CMS controls, homepage content, and contact conversions. GitHub
Actions runs the same suite for pushes to `main` and pull requests.

When adding or replacing gallery source photos, run `npm run optimize:gallery`
and commit the generated 360px/720px JPEG and WebP thumbnails with the originals.

Browser tests stub CMS API responses to verify the admin UI by role. They do not
prove Cloudflare Access, D1, R2, or Resend are configured correctly. Complete
the real staging checks in [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md) before
production deployment.

## Important notes

- This repo is not a Node.js app with a conventional build pipeline; it is a static website with serverless API routes.
- Some sections depend on Cloudflare-only services such as D1 and Cloudflare Access.
- The site continues to include older legacy files, but the modern public workflows use Cloudflare Pages Functions.
- The block estimator is a planning helper. It should not be treated as a formal quote or exact bill of quantities without review by the company.

## Summary

This repository is the digital front door for CMI Group Uganda: it markets the company, captures enquiries and project interest, shows property information, supports public reviews, and gives the admin team a CMS-powered way to manage content. The combination of static HTML pages and Cloudflare serverless functions makes it a practical low-maintenance setup for a service business website.
