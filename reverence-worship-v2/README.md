This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Annual membership commitments

Open **Intercession → Forms → Manage → Create form → Templates → Annual commitment**. Set the year, member fields and editing permissions. Add the description and extra questions with the existing builder, preview, and publish. Submitting the form records the member's commitment; there is no separate terms or acceptance section. Duplicate a previous commitment to prepare the following year.

Members use their existing accounts to review prefilled information and submit their commitment. Submitted profile information, answers, and submission times are preserved independently of later profile or form changes. **My Results → My annual commitments** opens a member's history. **Reports → Annual membership commitments** shows accepted and pending members, reminders, and Excel/PDF exports.

To let members choose their membership in a commitment question, select **Membership type** from the question type menu. A new question starts with three bilingual answer choices mapped to **Permanent**, **Temporary**, and **Partner**. You can edit the answer wording and use the dropdown beside each answer to change its mapping. The question starts optional; the administrator can turn on **Required**. One unconditional question can control membership per form. On submission, a selected answer updates a signed-in member's account in the same transaction as their response and commitment. An unanswered optional question leaves the member's current type unchanged. The profile membership field shows the current type; the question supplies the new type. Translated labels are independent of stored membership values. The submitted snapshot and audit record preserve the choice and any change. Other editable profile fields are applied on submission too.

Before deploying this version, run `npm run db:deploy`, then `npm run build`. The database migration adds the annual commitment records without changing existing membership enum values. `npm test` runs the regular regression suite. To run the database concurrency and history checks in an isolated schema using PowerShell:

```powershell
$env:RUN_COMMITMENT_DATABASE_TEST = '1'
npx tsx --test tests/membership-commitment-database.test.ts
Remove-Item Env:RUN_COMMITMENT_DATABASE_TEST
```

## Projection

Open **Music → Playlist → Projection** to present song lyrics or Bible passages. The operator screen includes playlist selection, Bible translation comparison, slide previews, themes, overlays, blanking, keyboard controls, display detection, and a dedicated audience-only output.

For the most reliable projector experience on Windows, connect HDMI, press **Windows + P**, and choose **Extend**. Chrome and Edge can place the web output on a selected display after permission is granted. In browser mode, confirm fullscreen by clicking once inside the audience output (or press **F**) to remove the browser title and address bars.

An optional native desktop shell is included for a true frameless fullscreen output and native monitor selection, without Chrome headings:

```bash
npm run desktop:install
npm run desktop:dev
```

`desktop:dev` starts the Next.js development server when it is not already running, then opens the native Reverence Worship shell. Use Projection from that shell—not a normal Chrome tab—for automatic frameless fullscreen.

See [`desktop-projector/README.md`](desktop-projector/README.md) for deployed-URL configuration and operating instructions.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Email delivery

Copy the SMTP variables from `.env.example` into `.env` for local development and into the hosting provider's environment settings for production. `SMTP_HOST` and `SMTP_FROM` are required. When `SMTP_USER` is set, `SMTP_PASSWORD` is also required.

For Gmail, use `smtp.gmail.com`, port `587`, `SMTP_SECURE=false`, and a Google App Password rather than the normal account password. Set `APP_URL` to the deployed application URL so email action links work, and set `CRON_SECRET` so queued-email retries can run.

After changing environment variables, restart or redeploy the application. Then open **System Settings → Notifications** to:

- verify email-delivery configuration;
- send a test email to the signed-in administrator;
- retry queued email deliveries;
- inspect queued and failed delivery counts.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
