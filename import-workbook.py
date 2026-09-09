"""Read the learning workbook without modifying it; produce a versioned web seed."""
import json
import re
import sys
from pathlib import Path
import openpyxl

book = openpyxl.load_workbook(sys.argv[1], data_only=True)
levels = {'Reconozco': 'recognize', 'Recuerdo con ayuda': 'assisted',
          'Puedo utilizarlo': 'ready', 'Lo utilizo': 'active'}
result = {'version': '2026-09-09', 'goals': {'words': book['Estado']['D4'].value,
          'grammar': book['Estado']['D12'].value}, 'words': [], 'grammar': []}
for sheet, collection in [('Palabras', 'words'), ('Frases', 'grammar')]:
    for row_number, row in enumerate(book[sheet].iter_rows(min_row=2, values_only=True), 2):
        status, category, raw, pinyin, meaning = row[:5]
        if not raw:
            continue
        parts = str(raw).split('/', 1)
        zh = parts[0].strip()
        result[collection].append({'id': f'workbook-{collection}-{row_number}',
            'zh': zh, 'pinyin': str(pinyin or ''), 'translation': str(meaning or ''),
            'categoryName': str(category or 'Sin categoria'),
            'pronunciationHint': parts[1].strip().rstrip('/') if len(parts) > 1 else '',
            'mastery': levels.get(status, 'planned'), 'sourceRow': row_number})
Path('workbook-seed.js').write_text('const WORKBOOK_SEED = ' + json.dumps(result, ensure_ascii=False) + ';\n', encoding='utf-8')
print(json.dumps({key: len(result[key]) for key in ('words', 'grammar')}))
