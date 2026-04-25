#!/usr/bin/env python3
"""Apply Matt's per-merchant category suggestions from the
"Uncategorized Review" tab to the live Transactions sheet.

Workflow Matt follows:
1. Periodically he eyeballs the top-100-by-impact uncategorized merchants
   in the "Uncategorized Review" sheet and fills in a "Suggested Category"
   per row.
2. This script reads those suggestions, maps them to canonical category
   names (creating new categories if Matt named one we don't have yet),
   and applies them to all matching live uncategorized transactions.

Reads the review sheet via `gog` (the sheets-db-api can't see beyond
column A on that tab — its row-1 header is a fancy title cell).
Reads/writes the live Transactions + Categories tabs via the budget app's
sheets-db-api.

Environment variables:
  BUDGET_SPREADSHEET_ID  (required)  Sheet ID
  GOG_KEYRING_PASSWORD   (required)  Required by gog to read the keyring
  GOG_ACCOUNT            (required)  Matt's Google account
  DRY_RUN                (optional)  If "false", apply changes. Default "true".

Usage:
  BUDGET_SPREADSHEET_ID=... \
  GOG_KEYRING_PASSWORD=... \
  GOG_ACCOUNT=matt.voget@gmail.com \
  python3 scripts/apply-uncategorized-suggestions.py

  Add DRY_RUN=false to actually write.
"""
import json
import os
import subprocess
import sys
import time
import urllib.request
import uuid
from datetime import datetime, timezone

API_URL = 'https://sheetsapi-g56q77hy2a-uc.a.run.app'
GOG_BIN = os.path.expanduser('~/bin/gog')

SHEET_ID = os.environ.get('BUDGET_SPREADSHEET_ID')
if not SHEET_ID:
    print('error: BUDGET_SPREADSHEET_ID not set', file=sys.stderr)
    sys.exit(1)

DRY_RUN = os.environ.get('DRY_RUN', 'true').lower() != 'false'

REVIEW_TAB = 'Uncategorized Review'
# Sheet layout: A1=title, A2=column headers, A3:E102=top-100 merchants,
# A103+=section break + full txn list. We want only the top-100 merchants.
REVIEW_RANGE = f"'{REVIEW_TAB}'!A3:E102"

# Map Matt's free-form suggestions to canonical category names. Anything not
# in this map and not in the existing Categories sheet is treated as a new
# category to create.
SUGGESTION_ALIASES = {
    'Gift': 'Gifts',
    'Car': 'Auto',
    'Kids': 'Kids & Family',
    'Fitness': 'Fitness & Sports',
}

# Categories Matt asked for that aren't in the canonical 20-bucket taxonomy
# yet. Will be created if missing.
NEW_CATEGORIES = {
    'Taxes': {'icon': '🧾', 'color': '#dc2626'},
    'Personal Dev Projects': {'icon': '🛠', 'color': '#8b5cf6'},
}

# Suggestions to skip (ambiguous, typo, etc.). Reported but not applied.
SKIP_SUGGESTIONS = {'Account'}


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


def create_row_verified(sheet_name, row, poll_wait=0.5):
    """Same hardener as scripts/split-income-categories.py — observed
    sheets-db-api lose a rapid POST silently and leave a duplicate of an
    adjacent row in its place. Verify by id lookup, retry once."""
    target_id = row.get('id')
    for attempt in (1, 2):
        _request('POST', f'/sheets/{sheet_name}/rows', row)
        time.sleep(poll_wait)
        rows = get_rows(sheet_name)
        if any(r.get('id') == target_id for r in rows):
            return True
        print(f'    ! POST did not land (attempt {attempt}); retrying in 1s')
        time.sleep(1.0)
    return False


def bulk_update(sheet_name, updates):
    _request('PUT', f'/sheets/{sheet_name}/rows/bulk', {'rows': updates})


def now_iso():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')


def read_review_merchants():
    """Returns dict: merchant_string -> raw_suggestion_string (only rows that
    have a suggestion filled in)."""
    out = subprocess.check_output(
        [GOG_BIN, 'sheets', 'get', SHEET_ID, REVIEW_RANGE, '-p']
    )
    mapping = {}
    for line in out.decode().splitlines():
        fields = line.split('\t')
        if len(fields) < 4:
            continue
        merchant = fields[0].strip()
        suggestion = fields[3].strip()
        if merchant and suggestion:
            mapping[merchant] = suggestion
    return mapping


print(f'== apply-uncategorized-suggestions (DRY_RUN={DRY_RUN}) ==')

# -------- 1. read merchant -> suggestion mapping --------------------------
print('\n[1/4] read suggestions from "Uncategorized Review" via gog')
merchant_to_suggestion = read_review_merchants()
print(f'  {len(merchant_to_suggestion)} merchants with a suggestion')

# Tally suggestions
from collections import Counter
sugg_counts = Counter(merchant_to_suggestion.values())

# -------- 2. resolve suggestion -> category (alias + create) --------------
print('\n[2/4] resolve suggestions to category ids')
categories = get_rows('Categories')
name_to_cat = {c.get('name'): c for c in categories if c.get('is_active') in ('TRUE','true','True',True)}

# Build the suggestion -> canonical name map
def canonical(suggestion):
    return SUGGESTION_ALIASES.get(suggestion, suggestion)

# Find which canonical names are missing
needed_canonical_names = set(canonical(s) for s in sugg_counts if s not in SKIP_SUGGESTIONS)
missing = [n for n in needed_canonical_names if n not in name_to_cat]
print(f'  suggestions in use: {dict(sugg_counts)}')
print(f'  canonical names needed: {sorted(needed_canonical_names)}')
print(f'  missing categories: {missing}')

# Create missing categories
suggestion_to_cat_id = {}
for canonical_name in missing:
    spec = NEW_CATEGORIES.get(canonical_name)
    if not spec:
        print(f'  ! suggestion "{canonical_name}" has no NEW_CATEGORIES entry — skipping')
        continue
    new_id = str(uuid.uuid4())
    row = {
        'id': new_id,
        'name': canonical_name,
        'type': 'expense',
        'icon': spec['icon'],
        'color': spec['color'],
        'budget_amount': '',
        'budget_cadence': '',
        'is_active': 'true',
        'created_at': now_iso(),
        'updated_at': now_iso(),
    }
    if DRY_RUN:
        print(f'  + would create: {canonical_name} ({new_id})')
    else:
        print(f'  + creating: {canonical_name} ({new_id})')
        if not create_row_verified('Categories', row):
            print(f'  ! failed to create {canonical_name} after retry — aborting')
            sys.exit(2)
    name_to_cat[canonical_name] = {'id': new_id, 'name': canonical_name}

# Now build the final suggestion -> category_id map
for sugg in sugg_counts:
    if sugg in SKIP_SUGGESTIONS:
        continue
    cname = canonical(sugg)
    cat = name_to_cat.get(cname)
    if cat:
        suggestion_to_cat_id[sugg] = cat['id']
    else:
        print(f'  ! unresolved suggestion "{sugg}" — skipping')

# -------- 3. find live uncategorized txns and build update list -----------
print('\n[3/4] match live uncategorized txns to merchant suggestions')
uncat_cat = next((c for c in categories if c.get('name') == 'Uncategorized'), None)
if not uncat_cat:
    print('  ! no Uncategorized category found — aborting')
    sys.exit(3)
uncat_id = uncat_cat['id']

txns = get_rows('Transactions')
uncat_txns = [(i, t) for i, t in enumerate(txns) if t.get('category_id') == uncat_id]
print(f'  live uncategorized txns: {len(uncat_txns)}')

pending_updates = []
matched_count = Counter()
unmatched = []
skipped = []

for i, t in uncat_txns:
    desc = (t.get('description') or '').strip()
    suggestion = merchant_to_suggestion.get(desc)
    if suggestion is None:
        unmatched.append(desc)
        continue
    if suggestion in SKIP_SUGGESTIONS:
        skipped.append((desc, suggestion))
        continue
    target_id = suggestion_to_cat_id.get(suggestion)
    if not target_id:
        skipped.append((desc, f'unresolved:{suggestion}'))
        continue
    merged = {**t, 'category_id': target_id, 'updated_at': now_iso()}
    pending_updates.append({'rowIndex': i + 2, 'data': merged})
    matched_count[canonical(suggestion)] += 1

print(f'  to update: {len(pending_updates)}')
for cname, n in matched_count.most_common():
    print(f'    → {cname}: {n}')
print(f'  unmatched (no merchant entry in review sheet): {len(unmatched)}')
print(f'  skipped (Account/etc): {len(skipped)}')

# -------- 4. apply ---------------------------------------------------------
print('\n[4/4] apply')
if pending_updates and not DRY_RUN:
    BATCH = 100
    for start in range(0, len(pending_updates), BATCH):
        chunk = pending_updates[start:start + BATCH]
        print(f'  applying {start + 1}..{start + len(chunk)} / {len(pending_updates)}')
        bulk_update('Transactions', chunk)
        time.sleep(0.2)
elif pending_updates:
    print('  (dry-run — no writes)')

if unmatched:
    print(f'\nFirst 10 unmatched txn descriptions:')
    for d in unmatched[:10]:
        print(f'  {d!r}')
    print(f'(... {len(unmatched)} total)')

if skipped:
    print(f'\nSkipped:')
    for d, why in skipped:
        print(f'  {d!r} → {why}')

print('\ndone.' + (' (DRY-RUN — no changes applied)' if DRY_RUN else ''))
