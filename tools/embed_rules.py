#!/usr/bin/env python3
"""把 rules/rules.json 注入 Checker.user.js 的 EMBEDDED_RULES 区段。"""

import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
script = root / 'Checker.user.js'
rules = json.loads((root / 'rules' / 'rules.json').read_text(encoding='utf-8'))
text = script.read_text(encoding='utf-8')

start = '    /* __EMBEDDED_RULES_START__ */'
end = '    /* __EMBEDDED_RULES_END__ */'
begin = text.index(start)
finish = text.index(end) + len(end)
payload = json.dumps(rules, ensure_ascii=False, separators=(',', ':'))
block = f'{start}\n    const EMBEDDED_RULES = {payload};\n{end}'
script.write_text(text[:begin] + block + text[finish:], encoding='utf-8')
print(f'embedded {len(rules.get("checkers", []))} checkers into {script}')
