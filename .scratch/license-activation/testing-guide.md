# License Activation — Testing Guide

## 1. Polar.sh Setup

1. Create a Polar account at [polar.sh](https://polar.sh)
2. Create a **product** — one-time payment, $29, with a "License Keys" benefit attached
3. Configure the license key benefit — set device limit (e.g. 3 activations)
4. Note your **Organization ID** (UUID, visible in Polar dashboard URL or API)
5. Repeat in Polar's **sandbox** environment for safe testing without real payments

## 2. Environment Variables

Add to your shell or prefix to `pnpm dev`:

```bash
# Sandbox testing (Polar sandbox environment — no real charges)
POLAR_SANDBOX=true
POLAR_SANDBOX_ORG_ID=<your-sandbox-org-uuid>

# Production (only needed for release builds)
POLAR_ORG_ID=<your-production-org-uuid>
```

These are read in `src/main/index.ts` at startup.

## 3. Testing the Trial Flow (No Polar Needed)

Start the app with enforcement enabled:

```bash
OFFICIAL_BUILD=true pnpm dev
```

This makes the app behave like a release build:
- Trial banner appears at the top (14 days remaining)
- Expiry is enforced after 14 days
- Blocked-action prompts appear when trial expires

### Simulate expiry without waiting 14 days

1. Start with `OFFICIAL_BUILD=true pnpm dev`
2. Confirm the trial banner shows
3. Quit the app
4. Open the database directly:
   ```bash
   sqlite3 ~/Library/Application\ Support/audistill/audistill.db
   ```
5. Backdate the trial start:
   ```sql
   UPDATE license SET trial_started_at = '2026-05-01T00:00:00.000Z' WHERE id = 1;
   ```
6. Restart the app — it enters read-only mode
7. Try to ingest a file, send a chat message, or run a recipe — see the blocked-action prompt

### Reset the trial

```sql
DELETE FROM license WHERE id = 1;
```

Restart the app — fresh trial begins.

## 4. Testing Activation (Requires Polar Sandbox)

1. Start with `OFFICIAL_BUILD=true POLAR_SANDBOX=true POLAR_SANDBOX_ORG_ID=<id> pnpm dev`
2. Purchase a test license from your Polar sandbox checkout page
3. Polar emails you a license key (sandbox keys work the same as production)
4. Open Settings → License in the app
5. Paste the key and click Activate
6. Banner disappears, state shows "Licensed" with masked key

### Test device limit

1. Activate on the current machine
2. Change the machine ID (or test on a second Mac)
3. Activate again — if device limit is reached, see the "Device limit reached" inline error

### Test deactivation

1. While licensed, click "Deactivate this device" in Settings → License
2. State reverts to trial (if days remain) or trial-expired
3. The activation slot is freed on Polar's side

## 5. Testing Revalidation

1. Activate a license
2. Quit the app
3. Disconnect from the internet
4. Start the app — should still show "Licensed" (grace period)
5. Backdate `last_validated_at` by 31+ days in SQLite:
   ```sql
   UPDATE license SET last_validated_at = '2026-04-01T00:00:00.000Z' WHERE id = 1;
   ```
6. Restart (still offline) — should transition to "License invalid"
7. Reconnect to internet, restart — should revalidate and return to "Licensed"

## 6. Testing Revocation

1. Activate a license
2. In the Polar dashboard, revoke or disable the key
3. Restart the app — revalidation detects revocation, state becomes "License invalid"
4. Existing library data remains viewable

## 7. Items Not Yet Configured (Placeholders)

| Item | Location | Action needed |
|------|----------|---------------|
| Polar org IDs | `src/main/index.ts` | Replace env var reads with real UUIDs once Polar is set up |
| Checkout URL | `src/renderer/src/components/LicensePane.tsx` | Replace `https://polar.sh/audistill/checkout` with real Polar checkout link |
| Portal URL | `src/renderer/src/components/LicensePane.tsx` | Replace `https://polar.sh/audistill/portal` with real Polar portal link |
| Landing page URL | `src/renderer/src/components/LicensePane.tsx` | Replace `https://audistill.com` once the site is live |
| `node-machine-id` external | `electron.vite.config.ts` | May need adding to `rollupOptions.external` if bundling fails in production builds |
| `.env` loading | Build config | Consider adding `dotenv` or electron-vite env loading for dev convenience |

## 8. Verifying the Build Flag

| Mode | `__OFFICIAL_BUILD__` | Behavior |
|------|---------------------|----------|
| `pnpm dev` | `false` | No enforcement, always licensed |
| `OFFICIAL_BUILD=true pnpm dev` | `true` | Full enforcement, trial starts |
| `pnpm build` (local) | `false` | No enforcement |
| CI release build with `OFFICIAL_BUILD=true` | `true` | Full enforcement in the DMG |
