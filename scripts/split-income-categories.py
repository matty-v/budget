#!/usr/bin/env python3
"""Split the catchall "Income" category into Paycheck / Reimbursement /
Investment / Other income, and rule-classify existing income transactions
into the new split.

Motivation: Outliers widget flags paychecks as unusual because the single
"Income" bucket mixes $3-10k paychecks with $0-$200 noise (interest postings,
small refunds, paypal transfers). Per-category medians are meaningless until
the pool is split.

Safe to run multiple times: category creation finds-or-creates by name+type,
txn updates skip anything already pointing to a new category, and the old
"Income" category is only deactivated (not deleted).

Environment variables:
  BUDGET_SPREADSHEET_ID  (required)  Sheet ID to migrate
  DRY_RUN                (optional)  If "false", apply changes. Default: "true".

Usage:
  BUDGET_SPREADSHEET_ID=... python3 scripts/split-income-categories.py
  BUDGET_SPREADSHEET_ID=... DRY_RUN=false python3 scripts/split-income-categories.py
"""

import json
import os
import sys
import time
import urllib.request
import uuid
from datetime import datetime, timezone

API_URL = 'https://sheetsapi-g56q77hy2a-uc.a.run.app'

SHEET_ID = os.environ.get('BUDGET_SPREADSHEET_ID')
if not SHEET_ID:
    print('error: BUDGET_SPREADSHEET_ID not set', file=sys.stderr)
    sys.exit(1)

DRY_RUN = os.environ.get('DRY_RUN', 'true').lower() != 'false'


# --- new category definitions ---------------------------------------------
NEW_CATEGORIES = [
    {
        'name': 'Paycheck',
        'type': 'income',
        'icon': '💼',
        'color': '#22c55e',
        'budget_cadence': 'monthly',
    },
    {
        'name': 'Reimbursement',
        'type': 'income',
        'icon': '💊',
        'color': '#06b6d4',
        'budget_cadence': '',
    },
    {
        'name': 'Investment',
        'type': 'income',
        'icon': '📈',
        'color': '#eab308',
        'budget_cadence': '',
    },
    {
        'name': 'Other income',
        'type': 'income',
        'icon': '💸',
        'color': '#94a3b8',
        'budget_cadence': '',
    },
]

# --- rule-based mapping from description substring to category name -------
# Order matters only when multiple rules could match; more specific rules
# should appear first. Matching is lowercase substring.
RULES = [
    # Paycheck: employer direct deposits, PEO processors, FAMLI leave pay, literal "paycheck"
    ('jama', 'Paycheck'),
    ('datawire', 'Paycheck'),
    ('trinet', 'Paycheck'),
    ('bamboohr', 'Paycheck'),
    ('famli', 'Paycheck'),
    ('paycheck', 'Paycheck'),
    # Reimbursement: HSA distributions, ATM fee rebates, vendor refunds
    ('wex claim', 'Reimbursement'),
    ('health equity', 'Reimbursement'),
    ('atm fee', 'Reimbursement'),
    ('travel credit', 'Reimbursement'),
    ('ticketmaster', 'Reimbursement'),
    ('stubhub', 'Reimbursement'),
    ('amazon mktplace', 'Reimbursement'),
    # Investment: brokerage, interest
    ('robinhood', 'Investment'),
    ('interest paid', 'Investment'),
    # One-offs that should land in Other
    ('turbotax', 'Other income'),
    ('mspbna', 'Other income'),
    ('paypal transfer', 'Other income'),
    ('mobile deposit', 'Other income'),
]
DEFAULT_CATEGORY = 'Other income'

OLD_CATEGORY_NAME = 'Income'


def _request(method, path, payload=None):
    req = urllib.request.Request(
        f'{API_URL}{path}',
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={'Content-Type': 'application/json', 'X-Spreadsheet-Id': SHEET_ID},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode()
        return resp.status, json.loads(body) if body else None


def get_rows(sheet_name):
    _, data = _request('GET', f'/sheets/{sheet_name}/rows')
    return data.get('rows', []) if data else []


def create_row(sheet_name, row):
    _request('POST', f'/sheets/{sheet_name}/rows', row)


def create_row_verified(sheet_name, row, poll_wait=0.5):
    """POST a row and confirm it landed. Observed 2026-04-24: the sheets-db-api
    silently lost one of four rapid consecutive POSTs to Categories and left
    a duplicate of an adjacent row in its place. Verify by id lookup and
    retry once before giving up."""
    target_id = row.get('id')
    for attempt in (1, 2):
        create_row(sheet_name, row)
        time.sleep(poll_wait)
        rows = get_rows(sheet_name)
        if any(r.get('id') == target_id for r in rows):
            return True
        print(f'    ! POST did not land (attempt {attempt}); retrying in 1s')
        time.sleep(1.0)
    return False


def bulk_update(sheet_name, updates):
    _request('PUT', f'/sheets/{sheet_name}/rows/bulk', {'rows': updates})


def update_row(sheet_name, row_index, data):
    _request('PUT', f'/sheets/{sheet_name}/rows/{row_index}', data)


def classify(description):
    d = (description or '').lower()
    for needle, target in RULES:
        if needle in d:
            return target
    return DEFAULT_CATEGORY


def now_iso():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')


print(f'== split-income-categories (DRY_RUN={DRY_RUN}) ==')

# -------- 1. find-or-create the 4 new categories --------------------------
print('\n[1/3] ensure new categories exist')
categories = get_rows('Categories')
cats_by_name = {(c.get('name'), c.get('type')): c for c in categories}

name_to_id = {}
for spec in NEW_CATEGORIES:
    existing = cats_by_name.get((spec['name'], spec['type']))
    if existing:
        print(f"  ✓ already exists: {spec['name']} ({existing['id']})")
        name_to_id[spec['name']] = existing['id']
        continue

    new_id = str(uuid.uuid4())
    row = {
        'id': new_id,
        'name': spec['name'],
        'type': spec['type'],
        'icon': spec['icon'],
        'color': spec['color'],
        'budget_amount': '',
        'budget_cadence': spec['budget_cadence'],
        'is_active': 'true',
        'created_at': now_iso(),
        'updated_at': now_iso(),
    }
    print(f"  + would create: {spec['name']} ({new_id})" if DRY_RUN else f"  + creating: {spec['name']} ({new_id})")
    if not DRY_RUN:
        ok = create_row_verified('Categories', row)
        if not ok:
            print(f"  ! failed to create {spec['name']} after retry — aborting to avoid corrupt state")
            sys.exit(2)
    name_to_id[spec['name']] = new_id

# -------- 2. reclassify income transactions -------------------------------
print('\n[2/3] reclassify income transactions')
old_income = cats_by_name.get((OLD_CATEGORY_NAME, 'income'))
if not old_income:
    print(f'  (no "{OLD_CATEGORY_NAME}" income category found — nothing to migrate)')
    old_id = None
else:
    old_id = old_income['id']
    print(f'  old "{OLD_CATEGORY_NAME}" id: {old_id}')

new_ids = set(name_to_id.values())

txns = get_rows('Transactions')
print(f'  scanning {len(txns)} transactions')

pending_updates = []
bucket_counts = {name: 0 for name in name_to_id}
skipped_already_migrated = 0
skipped_not_income = 0

for i, t in enumerate(txns):
    if t.get('type') != 'income':
        skipped_not_income += 1
        continue

    current_cat = t.get('category_id') or ''
    if current_cat in new_ids:
        skipped_already_migrated += 1
        continue
    # Only migrate rows that currently point at the old Income category (or
    # have no category at all) — avoid touching rows that already point to
    # something else an operator chose deliberately.
    if old_id and current_cat and current_cat != old_id:
        continue

    target_name = classify(t.get('description', ''))
    target_id = name_to_id[target_name]
    bucket_counts[target_name] += 1

    merged = {**t, 'category_id': target_id, 'updated_at': now_iso()}
    pending_updates.append({'rowIndex': i + 2, 'data': merged})

print(f'  skipped (not income): {skipped_not_income}')
print(f'  skipped (already migrated): {skipped_already_migrated}')
print(f'  to migrate: {len(pending_updates)}')
for name, count in bucket_counts.items():
    print(f'    → {name}: {count}')

if pending_updates and not DRY_RUN:
    BATCH = 100
    for start in range(0, len(pending_updates), BATCH):
        chunk = pending_updates[start:start + BATCH]
        print(f'  applying {start + 1}..{start + len(chunk)} / {len(pending_updates)}')
        bulk_update('Transactions', chunk)
        time.sleep(0.2)
elif pending_updates:
    print('  (dry-run — no writes)')

# -------- 3. deactivate the old Income category ---------------------------
print('\n[3/3] deactivate old "Income" category')
if not old_income:
    print('  (skip — no old category to deactivate)')
elif old_income.get('is_active') == 'false' or old_income.get('is_active') is False:
    print('  (skip — already inactive)')
else:
    old_row_index = categories.index(old_income) + 2
    merged = {**old_income, 'is_active': 'false', 'updated_at': now_iso()}
    if DRY_RUN:
        print(f'  would deactivate row {old_row_index}: {old_income.get("name")}')
    else:
        print(f'  deactivating row {old_row_index}: {old_income.get("name")}')
        update_row('Categories', old_row_index, merged)

print('\ndone.' + (' (DRY-RUN — no changes applied)' if DRY_RUN else ''))
