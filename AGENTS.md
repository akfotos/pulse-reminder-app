# Project information

- Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Radix Dialog, Lucide, Prisma 6, SQLite.
- Install with `npm install`; initialize the local database with `npm run db:push`; start with `npm run dev` on port 3000.
- Verification: `npm run typecheck`, `npm run build`, and `npm audit --omit=dev`.
- Production requires `APP_USERNAME` and `APP_PASSWORD` for the single-user HTTP Basic authentication middleware. Serve production traffic over HTTPS. Development does not require credentials.
- This is a single-user personal workspace, not a multi-tenant application. Sample reminders are created on the first reminder/settings GET when no settings row exists.
- SQLite database is `prisma/pulse.db`, configured through `DATABASE_URL`. Use a persistent filesystem for deployment. Vercel serverless deployment requires migrating the Prisma datasource to a persistent hosted database; bundled local SQLite is not durable on Vercel.
- Notifications require `RESEND_API_KEY`, a verified `EMAIL_FROM`, and `CRON_SECRET`. The daily cron route is scheduled at 08:00 UTC in `vercel.json`; the weekly digest is sent on Mondays. Real email delivery has not been tested without provider credentials.
- Import formats: first worksheet of XLSX, comma/tab-separated CSV or text, and comma/tab-separated text extracted from DOCX. File limit: 5 MB; row limit: 500. Import preview does not write data until confirmed.
- UI uses global CSS in `src/app/globals.css`, with the reference-inspired dashboard styling after the original base styles. Dashboard, calendar, category filters, settings, and dialogs are in `src/app/page.tsx`.
- Browser verification can use an existing Playwright installation with the system Chrome channel. Tested desktop at 1440 px and mobile at 390 px. Do not delete user reminders in tests; only remove test records created by the test itself.
