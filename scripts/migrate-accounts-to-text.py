#!/usr/bin/env python3
"""One-shot migration for #17: replace each Transaction's source_account_id
UUID with the resolved Account name, and (optionally) rename the now-unused
Accounts sheet to 'Accounts (archived)'.

Safe to run before OR after the PR lands:
- Before: new code doesn't exist yet; old code's `accounts.find(a => a.id === ...)`
  just returns undefined and the account name temporarily stops showing next to
  transactions. No data loss.
- After: new code reads the column as a name directly and displays it correctly.

Environment variables:
- BUDGET_SPREADSHEET_ID  (required)  Sheet ID to migrate
- ARCHIVE_ACCOUNTS_TAB   (optional)  If "true", attempt to rename the Accounts
  sheet to 'Accounts (archived)' at the end. Not strictly required — the app
  just stops reading it.

Usage:
  BUDGET_SPREADSHEET_ID=... python3 scripts/migrate-accounts-to-text.py
"""

import json
import os
import sys
import time
import urllib.request

API_URL = 'https://sheetsapi-g56q77hy2a-uc.a.run.app'

sheet_id = os.environ.get('BUDGET_SPREADSHEET_ID')
if not sheet_id:
    print('error: BUDGET_SPREADSHEET_ID not set', file=sys.stderr)
    sys.exit(1)


def _request(method, path, payload=None):
    req = urllib.request.Request(
        f'{API_URL}{path}',
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={
            'Content-Type': 'application/json',
            'X-Spreadsheet-Id': sheet_id,
        },
        method=method,
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode()
        return resp.status, json.loads(body) if body else None


def get_rows(sheet_name):
    _, data = _request('GET', f'/sheets/{sheet_name}/rows')
    return data.get('rows', []) if data else []


def bulk_update(sheet_name, updates):
    # updates: [{rowIndex, data}]
    _request('PUT', f'/sheets/{sheet_name}/rows/bulk', {'rows': updates})


# 1. Build id -> name map from Accounts
print('reading Accounts...')
accounts = get_rows('Accounts')
id_to_name = {a['id']: a['name'] for a in accounts if a.get('id') and a.get('name')}
print(f'  mapped {len(id_to_name)} accounts')

# 2. Read Transactions and build updates
print('reading Transactions...')
txns = get_rows('Transactions')
print(f'  got {len(txns)} rows')

updates = []
translated = 0
already_migrated = 0
orphaned = 0
for i, txn in enumerate(txns):
    current = txn.get('source_account_id') or ''
    if not current:
        continue
    if current in id_to_name:
        resolved = id_to_name[current]
        translated += 1
    elif current in id_to_name.values():
        # Already a name — idempotent re-run
        already_migrated += 1
        continue
    else:
        # Could be an untracked account id, or something else. Skip.
        orphaned += 1
        continue

    # Build a full row payload — the sheets-db-api is PUT-semantic, so any
    # field omitted here would get blanked.
    merged = {**txn, 'source_account_id': resolved, 'updated_at': txn.get('updated_at')}
    updates.append({'rowIndex': i + 2, 'data': merged})

print(
    f'summary: translating {translated} rows, '
    f'skipping {already_migrated} already-migrated, '
    f'skipping {orphaned} orphaned.'
)

# 3. Apply in chunks of 100 to stay well under the bulk API limit.
BATCH = 100
for start in range(0, len(updates), BATCH):
    chunk = updates[start:start + BATCH]
    print(f'  applying {start + 1}..{start + len(chunk)} / {len(updates)}')
    bulk_update('Transactions', chunk)
    time.sleep(0.2)

print('migration complete.')

if os.environ.get('ARCHIVE_ACCOUNTS_TAB') == 'true':
    print('renaming Accounts tab to "Accounts (archived)" is not supported by the sheets-db-api.')
    print('please rename manually in the Google Sheets UI if desired.')
