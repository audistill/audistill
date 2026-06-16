# macOS Release Pipeline

How to produce a signed, notarized release of Audistill on macOS.

## Prerequisites

- macOS with Xcode Command Line Tools (`xcode-select --install`)
- Apple Developer Program membership (renewed annually)
- Node.js 20+, pnpm
- All dependencies installed (`pnpm install`)

## Certificate Setup

### Create a Developer ID Application certificate

1. Open Keychain Access → Certificate Assistant → Request a Certificate from a CA
2. Fill in your email, leave CA blank, save to disk
3. Log into [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list)
4. Click "+" → Developer ID Application → upload your CSR
5. Download and double-click the `.cer` file to import into Keychain

### Export as .p12 (for portability)

1. In Keychain Access, find the "Developer ID Application: Your Name (TEAM_ID)" cert
2. Right-click → Export → save as `.p12` with a password
3. Store the `.p12` securely — this is your signing identity

### Configure for electron-builder

Set environment variables:

```bash
# Option A: cert in Keychain (local builds)
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"

# Option B: portable .p12 file (CI or other machines)
export CSC_LINK=/path/to/cert.p12
export CSC_KEY_PASSWORD=your-p12-password
```

## Notarization Credentials

### App Store Connect API Key (recommended)

1. Go to [App Store Connect → Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
2. Click "+" to generate a new key with "Developer" role
3. Download the `.p8` file (only downloadable once)
4. Note the Key ID and Issuer ID

```bash
export APPLE_API_KEY=/path/to/AuthKey_XXXXXXXX.p8
export APPLE_API_KEY_ID=XXXXXXXX
export APPLE_API_ISSUER=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Alternative: App-specific password

1. Go to [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords
2. Generate a password for "Audistill Notarization"

```bash
export APPLE_ID=your@apple.id
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=XXXXXXXXXX
```

## Running a Release

```bash
# Standard release
pnpm release:mac

# With version bump
pnpm release:mac --bump patch   # 0.1.0 → 0.1.1
pnpm release:mac --bump minor   # 0.1.0 → 0.2.0
pnpm release:mac --bump major   # 0.1.0 → 1.0.0
```

The script runs:
1. Preflight checks (signing identity, notarization creds)
2. Version bump (if `--bump` specified)
3. Typecheck
4. Tests
5. electron-vite build
6. electron-builder (package + sign + notarize)
7. Post-build verification (codesign, spctl, stapler)

### Publishing to GitHub Releases

After `pnpm release:mac` succeeds:

```bash
# Upload to GitHub Releases (creates a draft)
electron-builder --mac --publish always

# Or manually create a release with the artifacts
gh release create v$(node -p "require('./package.json').version") \
  dist/*.dmg dist/*.zip dist/latest-mac.yml \
  --title "v$(node -p "require('./package.json').version")" \
  --draft
```

## Troubleshooting

### "identity not found in Keychain"

- Verify the cert is in your login keychain: `security find-identity -v -p codesigning`
- Check the exact name matches `CSC_NAME` (including team ID in parentheses)
- If using a `.p12`, ensure `CSC_LINK` points to the correct file and `CSC_KEY_PASSWORD` is correct

### Notarization rejected

- Check the rejection email from Apple for specific issues
- Common causes: missing entitlements, unsigned helper binaries, hardened runtime violations
- Run `xcrun notarytool log <submission-id>` to see detailed rejection reasons
- Ensure all native binaries in `asarUnpack` are code-signed (electron-builder handles this automatically)

### App crashes under hardened runtime

- Check Console.app for crash logs mentioning "code signature invalid"
- Likely a missing entitlement — the current set covers Electron/V8 JIT needs and unsigned native modules
- If a new native dependency is added, it may need `disable-library-validation` (already granted)

## Annual Maintenance

- **Apple Developer Program:** Renew annually ($99/year). Certificates become invalid if membership lapses.
- **Developer ID cert:** Valid for 5 years from issuance. Keychain Access shows expiration date.
- **App Store Connect API key:** Does not expire, but can be revoked. Keep the `.p8` file backed up.
- **Credential rotation:** If a key is compromised, revoke it in Apple Developer portal, generate a new one, update env vars.

## Secrets Inventory

| Secret | Location | Rotation |
|--------|----------|----------|
| Developer ID cert (.p12) | macOS Keychain / secure storage | Every 5 years |
| CSC_KEY_PASSWORD | Environment variable | When cert is rotated |
| APPLE_API_KEY (.p8) | Filesystem, not in repo | Revoke/regenerate if compromised |
| APPLE_API_KEY_ID | Environment variable | Tied to .p8 key |
| APPLE_API_ISSUER | Environment variable | Org-level, rarely changes |
