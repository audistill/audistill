---
title: "Add license table migration and database access methods"
status: done
created: 2026-06-13
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

Add a single-row `license` table to the SQLite database via a new migration, and expose typed read/write methods on DatabaseService for the license record.

The table stores:
- `trial_started_at` (TEXT, ISO timestamp, nullable — null means no trial started yet)
- `license_key` (TEXT, nullable)
- `activation_id` (TEXT, nullable)
- `last_validated_at` (TEXT, ISO timestamp, nullable)
- `machine_id` (TEXT, nullable)

The table always has exactly zero or one row. The database methods should handle the "no row yet" case (first launch) by returning null, and upsert on writes.

Follow the existing migration pattern established in `MigrationService` — add a new migration step that creates the table if it doesn't exist.

Expose on DatabaseService:
- `getLicenseRecord(): LicenseRecord | null`
- `upsertLicenseRecord(record: Partial<LicenseRecord>): void`

Define a `LicenseRecord` interface in database-service.ts.

## Acceptance criteria

- [ ] `license` table is created by the migration on first launch (existing databases gain the table without data loss)
- [ ] `getLicenseRecord()` returns null when no row exists
- [ ] `getLicenseRecord()` returns the full typed record when a row exists
- [ ] `upsertLicenseRecord()` inserts on first call, updates on subsequent calls
- [ ] `LicenseRecord` interface is exported
- [ ] Unit tests cover: migration creates table, read-when-empty, insert, update, partial update
- [ ] Existing migration tests still pass

## Blocked by

None — can start immediately.
