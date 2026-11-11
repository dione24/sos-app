# SQLite validation contract

`mesh-transaction-sqlite.test.ts` uses the real `node:sqlite` engine with synthetic
data in `:memory:`. Run the suite on a Node version exposing this built-in module
(Node 22.13+ or a compatible newer release). The suite detects the capability and
is explicitly skipped if it is unavailable; a skipped suite is not evidence of
database correctness. CI/release validation must include a supported runtime.
No SDK upgrade or application runtime Node dependency is required.

The driver adapts Expo connection calls and shares a memory engine between test
handles. It exercises SQL, transactions, rollback, index creation, retention and
the application's per-path queue. It records only a redacted key marker. Native
connection creation and `PRAGMA cipher_version` are simulated: these tests do not
prove SQLCipher encryption, native connection isolation, foreign-key settings on
separate native connections, Bluetooth transport or Android scheduling.

Before a native release, validate version 2 → 3 migration against an isolated
encrypted database containing a synthetic profile and contacts. Confirm that
the dedicated writer is keyed before its first query, that profile/contact data
survives, and that overlapping claims/settings/privacy erasure complete without
lock or nested-BEGIN errors. Confirm writer reuse during a mesh burst and closure
on provider teardown or after 15 seconds idle. Do not use production user data.

Retention is limited to SOS/mesh records: history expires after 30 days and is
capped at 1,000 rows, whichever limit is reached first. Seen identifiers follow
the packet's signed 30-minute validity window; the allowed future timestamp skew
can make this up to 35 minutes after receipt. Migration gives receipt-based v2
seen rows a conservative five-minute grace before shortening the old 24-hour
policy. Origin quotas expire after their ten-minute window. No profile/contact
is deleted by retention. Explicit privacy erasure still clears all seven tables
and waits for previously queued operations before checkpoint/compaction.
