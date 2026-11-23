#!/usr/bin/env python3
"""从 list.txt 生成 rules/rules.json，并通过 B 站 card 接口补齐昵称和头像。"""

import argparse
import json
import os
import re
import time
import urllib.request
from pathlib import Path

STREAMER_HEADERS = {'游戏主播', '虚拟主播', '娱乐 / 生活区 UP 主', '解说 / 电竞'}
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')


def parse_list(path):
    entries = []
    section = ''
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        text = line.strip()
        if not text:
            continue
        if text.startswith('#'):
            title = text.lstrip('#').strip()
            if title and not title.startswith(('BilibiliUserChecker', '格式', '以 #')):
                section = title
            continue
        if '|' not in text:
            raise SystemExit(f'bad line: {line!r}')
        name, uid = [part.strip() for part in text.split('|', 1)]
        if not uid.isdigit():
            raise SystemExit(f'invalid uid: {line!r}')
        entries.append({
            'name': name,
            'uid': uid,
            'group': section,
            'streamer': section in STREAMER_HEADERS,
        })
    return entries


def norm(text):
    return re.sub(r'[\s:：·\-_/！!？?（）()【】\[\]「」]', '', str(text or '')).lower()


def fetch_card(uid, proxy):
    url = f'https://api.bilibili.com/x/web-interface/card?mid={uid}'
    request = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Referer': f'https://space.bilibili.com/{uid}',
    })
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({'http': proxy, 'https': proxy}) if proxy
        else urllib.request.ProxyHandler({})
    )
    with opener.open(request, timeout=20) as response:
        return json.loads(response.read().decode('utf-8'))


def load_cache(path):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except Exception:
        return {}


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument('--list', default=str(root / 'list.txt'))
    parser.add_argument('--out', default=str(root / 'rules' / 'rules.json'))
    parser.add_argument('--cache', default=str(root / '.cache' / 'cards.json'))
    parser.add_argument('--proxy', default=os.environ.get('BILI_PROXY', ''))
    parser.add_argument('--delay', type=float, default=0.32)
    args = parser.parse_args()

    entries = parse_list(args.list)
    cache = load_cache(args.cache)
    cache_path = Path(args.cache)
    cache_path.parent.mkdir(parents=True, exist_ok=True)

    failures = []
    consecutive = 0
    for index, entry in enumerate(entries, 1):
        uid = entry['uid']
        if cache.get(uid, {}).get('ok'):
            continue
        for attempt in range(3):
            try:
                data = fetch_card(uid, args.proxy)
                card = (data.get('data') or {}).get('card') or {}
                if data.get('code') == 0 and card.get('name'):
                    cache[uid] = {'ok': True, 'name': card.get('name'), 'face': card.get('face') or ''}
                else:
                    cache[uid] = {'ok': False, 'code': data.get('code'), 'message': data.get('message')}
                break
            except Exception as error:
                if attempt == 2:
                    cache[uid] = {'ok': False, 'code': 'NETWORK', 'message': str(error)}
                else:
                    time.sleep(1 + attempt)
        if not cache[uid].get('ok'):
            failures.append((entry['name'], uid, cache[uid].get('code'), cache[uid].get('message')))
            consecutive += 1
        else:
            consecutive = 0
        if index % 10 == 0:
            cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding='utf-8')
        if consecutive >= 12:
            raise SystemExit('too many consecutive failures; check proxy/rate limit')
        time.sleep(args.delay)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding='utf-8')

    checkers = []
    mismatches = []
    for entry in entries:
        cached = cache.get(entry['uid'], {})
        ok = bool(cached.get('ok'))
        api_name = cached.get('name') or ''
        face = cached.get('face') or ''
        if face.startswith('http://'):
            face = 'https://' + face[7:]
        keywords = []
        aliases = []
        if ok and api_name and norm(api_name) != norm(entry['name']):
            aliases.append(api_name)
            if norm(entry['name']) not in norm(api_name) and norm(api_name) not in norm(entry['name']):
                mismatches.append((entry['name'], entry['uid'], api_name, entry['group']))
        if not entry['streamer']:
            keywords.append(entry['name'])
            if api_name and api_name != entry['name']:
                keywords.append(api_name)
        item = {
            'displayName': entry['name'],
            'category': 'streamer' if entry['streamer'] else 'game',
            'showIcon': not entry['streamer'],
            'displayIcon': face,
            'keywords': keywords,
            'followings': [int(entry['uid'])],
            'link': f'https://space.bilibili.com/{entry["uid"]}',
            'group': entry['group'],
        }
        if aliases:
            item['aliases'] = aliases
        if not ok:
            item['dataStatus'] = 'unverified'
        checkers.append(item)

    rules = {
        'schema': 1,
        'version': time.strftime('%Y.%m.%d'),
        'updatedAt': time.strftime('%Y-%m-%d'),
        'source': 'list.txt + Bilibili card API',
        'counts': {
            'total': len(checkers),
            'games': sum(1 for item in checkers if item['category'] == 'game'),
            'streamers': sum(1 for item in checkers if item['category'] == 'streamer'),
        },
        'checkers': checkers,
    }
    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding='utf-8')

    print(f'entries={len(entries)} ok={sum(1 for item in cache.values() if item.get("ok"))} '
          f'failures={len(failures)} mismatches={len(mismatches)}')
    for name, uid, api_name, group in mismatches:
        print(f'name mismatch: {name} | {uid} | api={api_name} | {group}')
    for item in failures:
        print(f'failed: {item[0]} | {item[1]} | {item[2]} | {item[3]}')
    print(f'wrote {output} ({output.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
