# DELTA Solar Free — Independent Edition

This app works in your web browser without a paid ChatGPT subscription. It does **not** run inside ChatGPT Free: it runs in your own Cloudflare account. You can cancel Plus without affecting this deployment. The existing ChatGPT-hosted site is a separate app and is not changed by this package.

## What's different

- Static React dashboard: charts and energy calculations execute in your browser, avoiding server-side rendering.
- Small native Worker: secure signed EcoFlow requests, encrypted credentials, D1 history and a five-minute Cron Trigger.
- Own username/password; no ChatGPT sign-in, OpenAI API calls, tokens or hosting dependencies.
- Views covering more than 31 days load on demand rather than reloading every minute, reducing free database usage.
- History reads paginate in 300-record pages; backups paginate in 100-record pages to reduce server CPU and response size.
- Captured rows retain normalized measurements and UPS state; the complete raw diagnostic payload is not retained.
- Solar/battery/load graphs, device controls with read-back confirmation, UPS flag, dark/light mode, alerts, CSV export, JSON backup/restore, and control audit remain available.

## You need

A Cloudflare Free account, Node.js 22.13+, pnpm 11.25.0, valid approved EcoFlow API keys, and an online DELTA 2 linked to that EcoFlow account. To install pnpm if needed, run `npm install --global pnpm@11.25.0`. The free workers.dev address avoids purchasing a domain. Keep this single-owner dashboard private. Access uses HTTP Basic authentication over HTTPS.

## Deploy from Windows or another computer

1. Extract this ZIP. Open a terminal in `delta-solar-free`.
2. Install dependencies: `pnpm install --frozen-lockfile`.
3. Sign into Cloudflare: `pnpm exec wrangler login`.
4. Create the database: `pnpm exec wrangler d1 create delta-solar-free-db`.
5. Edit `wrangler.jsonc`: replace the placeholder `database_id` with the ID returned in step 4.
6. Apply tables/indexes: `pnpm exec wrangler d1 migrations apply delta-solar-free-db --remote`.
7. Check and build: `pnpm check`, `pnpm test`, then `pnpm build`.
8. Deploy: `pnpm exec wrangler deploy`. The app initially refuses access until secrets are configured.
9. Set these secrets interactively; paste values only at the prompt:

   ```text
   pnpm exec wrangler secret put DASHBOARD_USERNAME
   pnpm exec wrangler secret put DASHBOARD_PASSWORD
   pnpm exec wrangler secret put CREDENTIAL_ENCRYPTION_KEY
   ```

   Use a strong unique password, an ASCII username without `:`, and an encryption key of exactly **32 ASCII characters**. Generate that key with:

   ```text
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```

   Preserve this encryption key privately. Changing it prevents decryption of saved EcoFlow credentials.

10. Open the HTTPS workers.dev address returned by Wrangler. Sign in using your own dashboard username/password. Connect your EcoFlow device using your approved API keys and account server. The Philippine account previously worked with `https://api.ecoflow.com`, but choose the server matching your own account.
11. Click Record now. Confirm subsequent readings appear about five minutes apart. Close the dashboard for 15 minutes, reopen it, and confirm the scheduler saved new readings while it was closed. Cron changes can take time to propagate.
12. Inspect Cloudflare Worker metrics and D1 row metrics; check for CPU-limit or quota errors. `pnpm exec wrangler tail` can help inspect sanitized collector results.

## Move your current history

Before cancelling Plus, open the existing dashboard, choose Maintenance → Download history backup, and save the JSON file locally. After connecting the **same device serial** here, choose Maintenance → Restore JSON backup. Existing rows are retained and duplicate timestamps are skipped. Re-enter API keys; they are deliberately excluded from backups. Control audit records are not included in the history backup.

## Free does not mean unlimited

Cloudflare Workers Free currently provides 100,000 requests/day, 10 ms CPU per HTTP/cron invocation and five Cron Triggers per account. D1 Free includes five million rows read/day, 100,000 rows written/day and 5 GB total storage. Limits are shared with your other apps. D1 daily quota exhaustion stops queries until reset. This edition reduces server work, but production CPU/quotas must be verified in your account; no perpetual-free or uptime guarantee is made.

One five-minute collector produces at most approximately 288 successful readings/day and normally makes two EcoFlow API calls per recording (about 576/day), plus control actions, diagnostics and redirects. EcoFlow's official hourly request allowance remains unverified. HTTP 429 triggers cooldown, and failed captures use increasing backoff. Scheduled checks are five minutes apart; saved readings can have gaps during cooldowns, offline periods or outages.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, set all three secrets, run `pnpm build`, then `pnpm exec wrangler d1 migrations apply delta-solar-free-db --local` and `pnpm preview`. `pnpm dev` starts only the Vite frontend and does not provide the Worker API; use Wrangler preview for end-to-end testing.

## Validation

TypeScript checks, static UI build, Worker dry-run bundle, energy/control/reliability/auth unit checks and native Worker integration checks passed locally. Run `pnpm build` then `pnpm test:runtime` to repeat the integration checks. Live Cloudflare deployment, CPU/quota behavior and physical device operation have not been verified.

## Source map

`main.tsx`, `app/`: browser UI. `worker.ts`: native routing, password gate and cron. `lib/`: EcoFlow transport/signing, encrypted connection, collector, controls and energy calculations. `db/`, `drizzle/`: D1 interface and SQL migrations. `tests/`: energy, commands, auth, concurrency, cooldown and backup validation. `wrangler.jsonc`: independent deployment configuration.

The dependency lockfile retains the previously verified dependency set, including unused framework packages. The shipped Worker does not import the framework or perform server rendering. No real API keys, passwords, source-repository credentials or production history are included.

UPS is a reported API flag, not proof of physical backup transfer. Verify device controls and backup operation against the official EcoFlow app and your physical DELTA 2. Whole-house consumption and grid export are not measured.

## Official references

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/configuration/secrets/
