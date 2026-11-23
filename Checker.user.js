// ==UserScript==
// @name         B站用户成分指示器
// @namespace    https://github.com/klxf
// @version      2.5.4
// @description  基于 2.4 修复：适配 B 站新版评论区（Web Components + Shadow DOM），支持视频/动态/专栏/opus/空间页
// @author       klxf, trychen, miayoshi（原作者）；Shadow DOM 修复版
// @license      GPLv3
// @match        https://space.bilibili.com/*
// @match        https://t.bilibili.com/*
// @match        https://www.bilibili.com/read/*
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/v/topic/detail/*
// @match        https://www.bilibili.com/opus/*
// @icon         https://static.hdslb.com/images/favicon.ico
// @connect      api.bilibili.com
// @connect      api.live.bilibili.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const STORE_KEY = 'checkers_v2';
    const LEGACY_KEY = 'settings';

    const DEFAULT_CHECKERS = [
        {
            displayName: '永雏塔菲',
            displayIcon: 'https://i1.hdslb.com/bfs/face/4907464999fbf2f2a6f9cc8b7352fceb6b3bfec3.jpg@240w_240h_1c_1s.jpg',
            keywords: ['谢谢喵', 'taffy', '雏草姬'],
            followings: [1265680561]
        },
        {
            displayName: '東雪蓮',
            displayIcon: 'https://i0.hdslb.com/bfs/face/ced15dc126348dc42bd5c8eefdd1de5e48bdd8e6.jpg@240w_240h_1c_1s.jpg',
            keywords: ['東雪蓮Official', '东雪莲', '莲宝'],
            followings: [1437582453]
        },
        {
            displayName: '原神',
            displayIcon: 'https://i2.hdslb.com/bfs/face/d2a95376140fb1e5efbcbed70ef62891a3e5284f.jpg@240w_240h_1c_1s.jpg',
            keywords: ['互动抽奖 #原神', '米哈游', '#米哈游#', '#miHoYo#'],
            followings: [401742377, 1872522256, 1593381854]
        },
        {
            displayName: '星穹铁道',
            displayIcon: 'https://i2.hdslb.com/bfs/face/e76fc676b58f23c6bd9161723f12da00c7e051c5.jpg@240w_240h_1c_1s.webp',
            keywords: ['互动抽奖 #崩坏星穹铁道'],
            followings: [1340190821]
        },
        {
            displayName: '鸣潮',
            displayIcon: '',
            keywords: ['鸣潮', '漂泊者', '库洛游戏'],
            followings: []
        },
        {
            displayName: '绝区零',
            displayIcon: 'https://i0.hdslb.com/bfs/face/049b47e0e73fc5cc1564343bb0aeacce8ae8e6f8.jpg',
            keywords: ['互动抽奖 #绝区零'],
            followings: [1636034895]
        },
        {
            displayName: '王者荣耀',
            displayIcon: 'https://i2.hdslb.com/bfs/face/effbafff589a27f02148d15bca7e97031a31d772.jpg@240w_240h_1c_1s.jpg',
            keywords: ['互动抽奖 #王者荣耀', '王者荣耀'],
            followings: [57863910]
        },
        {
            displayName: '明日方舟',
            displayIcon: 'https://i0.hdslb.com/bfs/face/89154378c06a5ed332c40c2ca56f50cd641c0c90.jpg@240w_240h_1c_1s.jpg',
            keywords: ['互动抽奖 #明日方舟', '危机合约', '《明日方舟》'],
            followings: [161775300]
        }
    ];

    const FONT = 'font:12px/1.5 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;';
    const COMMENT_TAG_RE = /^bili-comment/i;
    const USER_CLASS_RE = /(?:^|\s)(?:user-name|sub-user-name|user-name__)(?:\s|$)/i;

    // 只枚举评论相关宿主，避免每次全量遍历 document
    const ROOT_HOST_SELECTOR = 'bili-comments, bili-comment-thread-renderer, bili-comment-reply-renderer, '
        + 'bili-comment-renderer, bili-comment-user-info, bili-rich-text, bili-comment-action-buttons-renderer, '
        + 'bili-comment-box, [class*="comment"], [class*="reply"]';
    const SCAN_DELAY = 600;
    const SCAN_INTERVAL = 2000;
    const DEEP_SCAN_INTERVAL = 15000;
    const DEBUG_KEY = 'bspc_debug';

    let checkers = loadCheckers();
    let options = loadOptions();
    let manualTags = loadManualTags();
    const userCache = new Map();
    const queue = [];
    let running = false;
    let lastStart = 0;
    const processed = new WeakSet();
    const observedRoots = new WeakSet();
    let scanScheduled = false;
    let lastDeepAt = 0;
    let debug = false;
    let spacePanelClosed = false;
    let uploaderPanelClosed = false;
    try { debug = localStorage.getItem(DEBUG_KEY) === '1'; } catch (e) {}

    function dlog() {
        if (!debug) return;
        try {
            console.debug.apply(console, ['[成分指示器]'].concat(Array.prototype.slice.call(arguments)));
        } catch (e) {}
    }

    function setDebug(value) {
        debug = !!value;
        try { localStorage.setItem(DEBUG_KEY, debug ? '1' : '0'); } catch (e) {}
        console.info('[成分指示器] 诊断日志已' + (debug ? '开启' : '关闭'));
    }

    /* ---------------- 设置读写 ---------------- */

    function sanitizeCheckers(list) {
        if (!Array.isArray(list)) return null;
        const out = [];
        for (const item of list) {
            if (!item || typeof item !== 'object') continue;
            const displayName = String(item.displayName || '').trim();
            if (!displayName) continue;
            const keywords = Array.isArray(item.keywords)
                ? item.keywords.map(function (k) { return String(k || '').trim(); }).filter(Boolean)
                : [];
            const followings = Array.isArray(item.followings)
                ? item.followings.map(Number).filter(function (n) { return Number.isFinite(n); })
                : [];
            out.push({
                displayName: displayName,
                displayIcon: typeof item.displayIcon === 'string' ? item.displayIcon.trim() : '',
                keywords: keywords,
                followings: followings
            });
        }
        return out.length ? out : null;
    }

    function loadCheckers() {
        let list = null;
        try { list = sanitizeCheckers(GM_getValue(STORE_KEY)); } catch (e) {}
        if (!list) {
            try { list = sanitizeCheckers(GM_getValue(LEGACY_KEY)); } catch (e) {}
        }
        if (!list) list = JSON.parse(JSON.stringify(DEFAULT_CHECKERS));
        return list;
    }

    function saveCheckers() {
        try { GM_setValue(STORE_KEY, checkers); } catch (e) {}
        userCache.clear();
    }

    function loadOptions() {
        const defaults = { useFollowings: true, useMedals: true };
        try {
            const saved = GM_getValue('options_v2');
            if (saved && typeof saved === 'object') {
                return {
                    useFollowings: saved.useFollowings !== false,
                    useMedals: saved.useMedals !== false
                };
            }
        } catch (e) {}
        return defaults;
    }

    function saveOptions() {
        try { GM_setValue('options_v2', options); } catch (e) {}
        userCache.clear();
    }

    function loadManualTags() {
        try {
            const saved = GM_getValue('manual_tags_v1');
            if (!Array.isArray(saved)) return [];
            const out = [];
            for (const item of saved) {
                if (!item || !/^\d+$/.test(String(item.uid || ''))) continue;
                const name = String(item.name || '').trim();
                if (name) out.push({ uid: String(item.uid), name: name });
            }
            return out;
        } catch (e) {
            return [];
        }
    }

    function saveManualTags() {
        try { GM_setValue('manual_tags_v1', manualTags); } catch (e) {}
        userCache.clear();
    }

    function manualTagsFor(uid) {
        const id = String(uid);
        return manualTags.filter(function (item) { return item.uid === id; });
    }

    function addManualTag(uid, name) {
        const id = String(uid || '');
        const text = String(name || '').trim();
        if (!/^\d+$/.test(id) || !text) return false;
        for (const item of manualTags) {
            if (item.uid === id && item.name === text) return false;
        }
        manualTags.push({ uid: id, name: text });
        saveManualTags();
        return true;
    }

    function removeManualTag(uid, name) {
        manualTags = manualTags.filter(function (item) {
            return !(item.uid === String(uid) && item.name === name);
        });
        saveManualTags();
    }

    /* ---------------- Shadow DOM 扫描 ---------------- */

    function collectRoots(deep) {
        const roots = [document];
        const seen = new Set(roots);
        for (let i = 0; i < roots.length; i++) {
            let nodes;
            try {
                nodes = roots[i].querySelectorAll(deep ? '*' : ROOT_HOST_SELECTOR);
            } catch (e) { continue; }
            for (const node of nodes) {
                if (node.shadowRoot && !seen.has(node.shadowRoot)) {
                    seen.add(node.shadowRoot);
                    roots.push(node.shadowRoot);
                }
            }
        }
        return roots;
    }

    function inComment(el) {
        let root = el.getRootNode();
        let depth = 0;
        while (root && root.host && depth < 8) {
            if (COMMENT_TAG_RE.test(root.host.tagName || '')) return true;
            root = root.host.getRootNode();
            depth++;
        }
        let node = el;
        for (let i = 0; i < 6 && node; i++, node = node.parentElement) {
            const tag = (node.tagName || '').toLowerCase();
            if (tag.indexOf('bili-comment') === 0) return true;
            const cls = typeof node.className === 'string' ? node.className : '';
            if (USER_CLASS_RE.test(cls)) return true;
        }
        return false;
    }

    function findCandidates(root) {
        const out = [];
        let anchors = [];
        try { anchors = root.querySelectorAll('a[href*="space.bilibili.com/"]'); } catch (e) { anchors = []; }
        for (const anchor of anchors) {
            if (!inComment(anchor)) continue;
            const match = (anchor.getAttribute('href') || '').match(/space\.bilibili\.com\/(\d+)/);
            if (!match) continue;
            const text = (anchor.textContent || '').trim();
            if (!text || text.length > 30) continue;
            out.push({ el: anchor, uid: match[1], name: text });
        }

        let named = [];
        try {
            named = root.querySelectorAll('[data-user-id], [data-usercard-mid], .user-name, .sub-user-name');
        } catch (e) { named = []; }
        for (const node of named) {
            if (node.tagName === 'A') continue;
            if (!inComment(node)) continue;
            if (node.querySelector('a[href*="space.bilibili.com/"]')) continue;
            const text = (node.textContent || '').trim();
            if (!text || text.length > 30) continue;
            let uid = node.getAttribute('data-user-id') || node.getAttribute('data-usercard-mid') || '';
            if (!/^\d+$/.test(uid)) continue;
            out.push({ el: node, uid: uid, name: text });
        }
        return out;
    }

    function createBadge(target, uid) {
        const badge = document.createElement('span');
        badge.className = 'bili-composition-badge';
        badge.textContent = '查成分';
        badge.title = '查询该用户的动态 / 关注 / 粉丝牌';
        badge.style.cssText = FONT
            + 'display:inline-flex;align-items:center;gap:2px;margin:0 4px;padding:1px 6px;'
            + 'border-radius:10px;background:rgba(7,190,255,.15);color:#07beff;cursor:pointer;'
            + 'vertical-align:middle;';
        badge.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            startCheck(uid, badge);
        });
        target.insertAdjacentElement('afterend', badge);
    }

    /* ---------------- 查询引擎 ---------------- */

    function gmGet(url) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                timeout: 15000,
                anonymous: false,
                withCredentials: true,
                headers: { 'Referer': 'https://www.bilibili.com/' },
                onload: function (res) {
                    if (res.status !== 200) {
                        reject(new Error('HTTP ' + res.status));
                        return;
                    }
                    const text = res.responseText || (typeof res.response === 'string' ? res.response : '');
                    try {
                        resolve(JSON.parse(text));
                    } catch (e) {
                        reject(new Error('返回内容不是 JSON'));
                    }
                },
                onerror: function () { reject(new Error('网络错误')); },
                ontimeout: function () { reject(new Error('请求超时')); }
            });
        });
    }

    function extractDynamicText(settled) {
        if (!settled || settled.status !== 'fulfilled') return '';
        const data = settled.value;
        if (!data || data.code !== 0 || !data.data) return '';
        const items = data.data.items || data.data.cards || [];
        const parts = [];
        for (const item of items) {
            if (!item || typeof item !== 'object') continue;
            // 只取用户本人发布的内容；不读取 item.orig（转发原文不代表本人成分）
            const modules = item.modules || {};
            const dynamic = modules.module_dynamic || {};
            if (dynamic.desc && typeof dynamic.desc.text === 'string' && dynamic.desc.text) {
                parts.push(dynamic.desc.text);
            }
            if (dynamic.topic && dynamic.topic.name) parts.push(dynamic.topic.name);
            const major = dynamic.major;
            if (major) {
                if (major.archive && major.archive.title) parts.push(major.archive.title);
                if (major.opus && major.opus.title) parts.push(major.opus.title);
                if (major.article && major.article.title) parts.push(major.article.title);
                if (major.draw && major.draw.title) parts.push(major.draw.title);
            }
            // 兼容旧版卡片结构
            if (item.desc && typeof item.desc.text === 'string' && item.desc.text) {
                parts.push(item.desc.text);
            }
        }
        return parts.join('\n');
    }

    function extractFollowing(settled) {
        if (!settled || settled.status !== 'fulfilled') return [];
        const data = settled.value;
        if (!data || data.code !== 0 || !data.data) return [];
        const list = Array.isArray(data.data.list) ? data.data.list : (Array.isArray(data.data) ? data.data : []);
        return list.map(function (item) { return Number(item.mid || item.fid || item); })
            .filter(function (n) { return Number.isFinite(n); });
    }

    function extractMedals(settled) {
        if (!settled || settled.status !== 'fulfilled') return [];
        const data = settled.value;
        if (!data || data.code !== 0 || !data.data || !Array.isArray(data.data.list)) return [];
        return data.data.list.map(function (item) {
            return Number(item.medal_info && item.medal_info.target_id);
        }).filter(function (n) { return Number.isFinite(n); });
    }

    function apiHint(data) {
        if (!data) return '';
        if (data.code === -101) return '（未登录）';
        if (data.code === -352 || data.code === -412) return '（风控拦截）';
        if (data.code === 0) return '';
        return '（' + data.code + (data.message ? ': ' + data.message : '') + '）';
    }

    function queryUser(uid) {
        const started = Date.now();
        const dynUrl = 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid='
            + encodeURIComponent(uid) + '&timezone_offset=-480&features=itemOpusStyle';
        const folUrl = 'https://api.bilibili.com/x/relation/followings?vmid='
            + encodeURIComponent(uid) + '&pn=1&ps=50';
        const medUrl = 'https://api.live.bilibili.com/xlive/web-ucenter/user/MedalWall?target_id='
            + encodeURIComponent(uid);

        return Promise.allSettled([gmGet(dynUrl), gmGet(folUrl), gmGet(medUrl)]).then(function (settled) {
            const dynData = settled[0].status === 'fulfilled' ? settled[0].value : null;
            const folData = settled[1].status === 'fulfilled' ? settled[1].value : null;
            const medData = settled[2].status === 'fulfilled' ? settled[2].value : null;
            const dynText = extractDynamicText(settled[0]);
            const following = extractFollowing(settled[1]);
            const medals = extractMedals(settled[2]);
            const notes = [];
            if (!dynData || dynData.code !== 0) notes.push('动态接口不可用' + apiHint(dynData));
            if (!folData || folData.code !== 0) notes.push('关注列表不可用' + apiHint(folData));
            if (!medData || medData.code !== 0) notes.push('粉丝牌不可用' + apiHint(medData));

            if (debug) {
                console.debug('[成分指示器] 接口结果', {
                    uid: uid,
                    dynamic: dynData && dynData.code,
                    following: folData && folData.code,
                    medal: medData && medData.code,
                    elapsed: Date.now() - started
                });
            }

            const found = [];
            const seenNames = new Set();
            for (const item of manualTagsFor(uid)) {
                if (seenNames.has(item.name)) continue;
                seenNames.add(item.name);
                found.push({
                    checker: { displayName: item.name, displayIcon: '' },
                    reason: { source: 'manual', detail: '' }
                });
            }
            for (const checker of checkers) {
                if (seenNames.has(checker.displayName)) continue;
                let reason = null;
                if (checker.keywords.length && dynText) {
                    const word = checker.keywords.find(function (item) { return dynText.indexOf(item) !== -1; });
                    if (word) reason = { source: 'dynamic', detail: word };
                }
                if (!reason && options.useMedals && checker.followings.length && medals.length) {
                    const mid = checker.followings.find(function (id) { return medals.indexOf(id) !== -1; });
                    if (mid !== undefined) reason = { source: 'medal', detail: mid };
                }
                if (!reason && options.useFollowings && checker.followings.length && following.length) {
                    const mid = checker.followings.find(function (id) { return following.indexOf(id) !== -1; });
                    if (mid !== undefined) reason = { source: 'following', detail: mid };
                }
                if (reason) {
                    found.push({ checker: checker, reason: reason });
                    seenNames.add(checker.displayName);
                }
            }
            if (debug && found.length) {
                console.debug('[成分指示器] 命中', uid, found.map(function (item) {
                    return item.checker.displayName + ' @ ' + item.reason.source + ':' + item.reason.detail;
                }));
            }

            const usable = [dynData, folData, medData].some(function (data) {
                return data && data.code === 0;
            });
            if (!usable && found.length === 0) {
                throw new Error(notes.join('；') || '接口请求全部失败');
            }
            return { found: found, notes: notes };
        });
    }

    function startCheck(uid, badge, onDone) {
        badge.textContent = '检查中…';
        badge.style.cursor = 'default';
        const target = { badge: badge, onDone: onDone, uid: uid };
        const state = userCache.get(uid);

        if (state) {
            if (state.status === 'done') {
                renderResult(target, state);
            } else if (state.status === 'error') {
                renderError(target, state.error);
            } else {
                state.targets.push(target);
            }
            return;
        }

        userCache.set(uid, { status: 'loading', found: null, notes: [], error: '', targets: [target] });
        queue.push(uid);
        pumpQueue();
    }

    function pumpQueue() {
        if (running || !queue.length) return;
        running = true;
        const wait = Math.max(0, 350 - (Date.now() - lastStart));
        setTimeout(function () {
            const uid = queue.shift();
            lastStart = Date.now();
            const state = userCache.get(uid);
            if (!state) {
                running = false;
                pumpQueue();
                return;
            }
            queryUser(uid).then(function (result) {
                state.status = 'done';
                state.found = result.found;
                state.notes = result.notes || [];
                for (const target of state.targets) renderResult(target, state);
            }).catch(function (error) {
                state.status = 'error';
                state.error = error && error.message ? error.message : String(error);
                for (const target of state.targets) renderError(target, state.error);
            }).then(function () {
                running = false;
                pumpQueue();
            });
        }, wait);
    }

    function renderResult(target, state) {
        const badge = target.badge;
        if (!badge || !badge.isConnected) {
            if (target.onDone) target.onDone();
            return;
        }
        const wrapper = document.createElement('span');
        wrapper.className = 'bili-composition-tags';

        if (!state.found || !state.found.length) {
            const none = document.createElement('span');
            none.className = 'bili-composition-none';
            none.textContent = '无';
            none.style.cssText = FONT
                + 'display:inline-flex;align-items:center;gap:2px;margin:0 4px;padding:1px 6px;'
                + 'border-radius:10px;background:rgba(7,190,255,.15);color:#07beff;'
                + 'cursor:default;vertical-align:middle;opacity:0.75;';
            if (state.notes && state.notes.length) none.title = state.notes.join('；');
            wrapper.appendChild(none);
        } else {
            for (const item of state.found) {
                if (item.reason && item.reason.source === 'manual') {
                    wrapper.appendChild(makeManualTag(item.checker.displayName));
                } else {
                    wrapper.appendChild(makeTag(item.checker, item.reason));
                }
            }
        }
        wrapper.appendChild(makeManualAdd(target.uid, wrapper));
        badge.replaceWith(wrapper);
        if (target.onDone) target.onDone();
    }

    function renderError(target, message) {
        const badge = target.badge;
        if (!badge || !badge.isConnected) {
            if (target.onDone) target.onDone();
            return;
        }
        badge.textContent = '失败';
        badge.title = message || '查询失败';
        badge.style.cursor = 'default';
        badge.style.opacity = '0.6';
        if (target.onDone) target.onDone();
    }

    function makeTag(checker, reason) {
        const tag = document.createElement('span');
        tag.className = 'bili-composition-tag';
        tag.style.cssText = FONT
            + 'display:inline-flex;align-items:center;gap:3px;margin:0 3px;padding:0 5px;border-radius:4px;'
            + 'background:linear-gradient(135deg,#7c4dff,#e53935);color:#fff;vertical-align:middle;';
        if (reason) {
            let detail;
            if (reason.source === 'dynamic') detail = '动态命中「' + reason.detail + '」';
            else if (reason.source === 'medal') detail = '粉丝牌命中 UID ' + reason.detail;
            else detail = '仅关注了 UID ' + reason.detail + '（不代表确为该成分）';
            tag.title = checker.displayName + '：' + detail;
            if (reason.source === 'following') {
                tag.style.opacity = '0.8';
                tag.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,.65)';
            }
        }
        if (checker.displayIcon) {
            const icon = document.createElement('img');
            icon.src = checker.displayIcon;
            icon.style.cssText = 'width:14px;height:14px;border-radius:50%;display:block;';
            icon.addEventListener('error', function () { icon.remove(); });
            tag.appendChild(icon);
        }
        const name = document.createElement('span');
        name.textContent = checker.displayName;
        tag.appendChild(name);
        return tag;
    }

    function makeManualTag(name) {
        const tag = document.createElement('span');
        tag.className = 'bili-composition-tag bili-composition-tag--manual';
        tag.textContent = name;
        tag.title = '手动标注';
        tag.style.cssText = FONT
            + 'display:inline-flex;align-items:center;gap:2px;margin:0 3px;padding:0 5px;border-radius:4px;'
            + 'background:linear-gradient(135deg,#ff9800,#e53935);color:#fff;vertical-align:middle;';
        return tag;
    }

    function makeManualAdd(uid, container) {
        const add = document.createElement('span');
        add.className = 'bili-composition-manual-add';
        add.textContent = '＋';
        add.title = '手动添加标签';
        add.style.cssText = FONT
            + 'display:inline-flex;align-items:center;justify-content:center;width:18px;height:16px;'
            + 'margin-left:2px;border-radius:4px;color:#ffb74d;border:1px dashed rgba(255,183,77,.8);'
            + 'cursor:pointer;vertical-align:middle;';
        if (!uid) {
            add.style.display = 'none';
            return add;
        }
        add.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            const name = window.prompt('为 UID ' + uid + ' 手动添加标签：');
            if (!name || !name.trim()) return;
            if (addManualTag(uid, name)) {
                const none = container.querySelector('.bili-composition-none');
                if (none) none.remove();
                container.insertBefore(makeManualTag(name.trim()), add);
            } else {
                add.title = '标签为空或已存在';
            }
        });
        return add;
    }

    /* ---------------- 悬浮面板公共能力 ---------------- */

    function readPanelPos(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (data && Number.isFinite(data.left) && Number.isFinite(data.top)) return data;
        } catch (e) {}
        return null;
    }

    function savePanelPos(key, left, top) {
        try { localStorage.setItem(key, JSON.stringify({ left: left, top: top })); } catch (e) {}
    }

    function clampPanelPos(left, top, width, height) {
        const maxLeft = Math.max(4, window.innerWidth - width - 4);
        const maxTop = Math.max(4, window.innerHeight - height - 4);
        return {
            left: Math.min(Math.max(4, left), maxLeft),
            top: Math.min(Math.max(4, top), maxTop)
        };
    }

    function createFloatingPanel(id, titleText, positionKey, onClose) {
        const panel = document.createElement('div');
        panel.id = id;
        panel.style.cssText = FONT
            + 'position:fixed;z-index:2147483646;min-width:200px;max-width:300px;'
            + 'background:rgba(23,23,26,.92);color:#fff;border:1px solid rgba(255,255,255,.16);'
            + 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);overflow:hidden;';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:9px 10px 6px;'
            + 'cursor:move;user-select:none;';
        const title = document.createElement('div');
        title.textContent = titleText;
        title.style.cssText = 'font-weight:600;flex:1;';
        const close = document.createElement('span');
        close.textContent = '×';
        close.title = '关闭';
        close.setAttribute('data-no-drag', '1');
        close.style.cssText = 'flex:none;width:20px;height:20px;line-height:18px;text-align:center;'
            + 'border-radius:50%;color:#bbb;font-size:16px;cursor:pointer;';
        close.addEventListener('mouseenter', function () {
            close.style.background = 'rgba(255,255,255,.14)';
            close.style.color = '#fff';
        });
        close.addEventListener('mouseleave', function () {
            close.style.background = 'transparent';
            close.style.color = '#bbb';
        });
        close.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            panel.remove();
            if (onClose) onClose();
        });

        const body = document.createElement('div');
        body.style.cssText = 'padding:0 12px 10px;';
        header.appendChild(title);
        header.appendChild(close);
        panel.appendChild(header);
        panel.appendChild(body);

        const saved = readPanelPos(positionKey);
        if (saved) {
            const pos = clampPanelPos(saved.left, saved.top, 200, 90);
            panel.style.left = pos.left + 'px';
            panel.style.top = pos.top + 'px';
        } else {
            panel.style.left = '16px';
            panel.style.bottom = '16px';
        }

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let originLeft = 0;
        let originTop = 0;
        let previousUserSelect = '';

        header.addEventListener('pointerdown', function (event) {
            if (event.button !== 0 || event.target.closest('[data-no-drag]')) return;
            const rect = panel.getBoundingClientRect();
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            panel.style.bottom = 'auto';
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            originLeft = rect.left;
            originTop = rect.top;
            try { header.setPointerCapture(event.pointerId); } catch (e) {}
            previousUserSelect = document.body.style.userSelect;
            document.body.style.userSelect = 'none';
            event.preventDefault();
        });

        header.addEventListener('pointermove', function (event) {
            if (!dragging) return;
            const rect = panel.getBoundingClientRect();
            const pos = clampPanelPos(
                originLeft + event.clientX - startX,
                originTop + event.clientY - startY,
                rect.width,
                rect.height
            );
            panel.style.left = pos.left + 'px';
            panel.style.top = pos.top + 'px';
        });

        function endDrag() {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = previousUserSelect;
            const rect = panel.getBoundingClientRect();
            savePanelPos(positionKey, rect.left, rect.top);
        }
        header.addEventListener('pointerup', endDrag);
        header.addEventListener('pointercancel', endDrag);

        window.addEventListener('resize', function () {
            if (!panel.isConnected || !panel.style.top) return;
            const rect = panel.getBoundingClientRect();
            const pos = clampPanelPos(rect.left, rect.top, rect.width, rect.height);
            panel.style.left = pos.left + 'px';
            panel.style.top = pos.top + 'px';
        });

        return { panel: panel, body: body };
    }

    /* ---------------- 空间页入口 ---------------- */

    function initSpacePanel() {
        if (spacePanelClosed) return;
        if (location.hostname !== 'space.bilibili.com') return;
        const match = location.pathname.match(/^\/(\d+)/);
        if (!match || !document.body) return;
        const uid = match[1];

        let panel = document.getElementById('bili-composition-panel');
        if (panel) {
            if (panel.dataset.uid !== uid) {
                panel.dataset.uid = uid;
                const result = panel.querySelector('[data-role="result"]');
                if (result) result.textContent = '';
            }
            return;
        }

        const built = createFloatingPanel('bili-composition-panel', '成分查询', 'bspc_space_pos', function () {
            spacePanelClosed = true;
        });
        panel = built.panel;
        panel.dataset.uid = uid;

        const row = el('div', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;');
        const button = el('span', 'display:inline-block;padding:2px 10px;border-radius:999px;'
            + 'background:#07beff;color:#04222e;cursor:pointer;font-weight:600;', '查成分');
        const manual = el('span', 'color:#ffb74d;cursor:pointer;font-size:12px;', '＋手动');
        manual.title = '手动添加标签';
        const result = el('div', 'margin-top:8px;max-width:260px;');
        result.dataset.role = 'result';
        row.appendChild(button);
        row.appendChild(manual);
        built.body.appendChild(row);
        built.body.appendChild(result);

        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            const currentUid = panel.dataset.uid;
            if (!currentUid) return;
            result.textContent = '';
            const badge = el('span', FONT + 'color:#9ad9ff;', '检查中…');
            result.appendChild(badge);
            button.style.opacity = '0.6';
            startCheck(currentUid, badge, function () {
                button.textContent = '重新查询';
                button.style.opacity = '1';
            });
        });
        manual.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            const currentUid = panel.dataset.uid;
            if (!currentUid) return;
            const name = window.prompt('为 UID ' + currentUid + ' 手动添加标签：');
            if (!name || !name.trim()) return;
            if (addManualTag(currentUid, name)) {
                result.insertBefore(makeManualTag(name.trim()), result.firstChild);
            }
        });

        document.body.appendChild(panel);
    }

    /* ---------------- 视频页 UP 主入口 ---------------- */

    function findUploader() {
        const selectors = [
            '.up-info-container a[href*="space.bilibili.com/"]',
            '.up-info--name a[href*="space.bilibili.com/"]',
            '.up-name[href*="space.bilibili.com/"]',
            'a.up-name[href*="space.bilibili.com/"]',
            '.video-info-container a[href*="space.bilibili.com/"]',
            '.video-info a[href*="space.bilibili.com/"]'
        ];
        for (const selector of selectors) {
            let elements = [];
            try { elements = document.querySelectorAll(selector); } catch (e) { elements = []; }
            for (const element of elements) {
                const match = (element.getAttribute('href') || '').match(/space\.bilibili\.com\/(\d+)/);
                if (!match) continue;
                const name = (element.textContent || '').trim();
                if (!name) continue;
                return { uid: match[1], name: name };
            }
        }
        return null;
    }

    function initUploaderPanel() {
        if (uploaderPanelClosed) return;
        if (location.hostname !== 'www.bilibili.com' || location.pathname.indexOf('/video/') !== 0) return;
        if (!document.body) return;
        const uploader = findUploader();
        if (!uploader) return;

        let panel = document.getElementById('bili-composition-uploader');
        if (!panel) {
            const built = createFloatingPanel('bili-composition-uploader', 'UP主成分', 'bspc_uploader_pos', function () {
                uploaderPanelClosed = true;
            });
            panel = built.panel;

            const who = el('div', 'font-size:12px;color:#bbb;margin-bottom:6px;max-width:240px;'
                + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;');
            who.dataset.role = 'who';
            const row = el('div', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;');
            const button = el('span', 'display:inline-block;padding:2px 10px;border-radius:999px;'
                + 'background:#07beff;color:#04222e;cursor:pointer;font-weight:600;', '查成分');
            button.dataset.role = 'button';
            const manual = el('span', 'color:#ffb74d;cursor:pointer;font-size:12px;', '＋手动');
            manual.title = '手动添加标签';
            const result = el('div', 'margin-top:8px;max-width:260px;');
            result.dataset.role = 'result';
            row.appendChild(button);
            row.appendChild(manual);
            built.body.appendChild(who);
            built.body.appendChild(row);
            built.body.appendChild(result);

            button.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                const uid = panel.dataset.uid;
                if (!uid) return;
                result.textContent = '';
                const badge = el('span', FONT + 'color:#9ad9ff;', '检查中…');
                result.appendChild(badge);
                button.style.opacity = '0.6';
                startCheck(uid, badge, function () {
                    button.textContent = '重新查询';
                    button.style.opacity = '1';
                });
            });
            manual.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                const uid = panel.dataset.uid;
                if (!uid) return;
                const name = window.prompt('为 UID ' + uid + ' 手动添加标签：');
                if (!name || !name.trim()) return;
                if (addManualTag(uid, name)) {
                    result.insertBefore(makeManualTag(name.trim()), result.firstChild);
                }
            });

            document.body.appendChild(panel);
        }

        const who = panel.querySelector('[data-role="who"]');
        const button = panel.querySelector('[data-role="button"]');
        const result = panel.querySelector('[data-role="result"]');
        const changed = panel.dataset.uid !== uploader.uid;
        panel.dataset.uid = uploader.uid;
        panel.dataset.name = uploader.name;
        if (who) who.textContent = 'UP主：' + uploader.name;
        if (changed) {
            if (button) {
                button.textContent = '查成分';
                button.style.opacity = '1';
            }
            if (result) result.textContent = '';
        }
    }

    /* ---------------- 设置面板 ---------------- */

    function el(tag, style, text) {
        const node = document.createElement(tag);
        if (style) node.style.cssText = style;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function openSettings() {
        if (document.getElementById('bili-composition-settings')) return;
        let draft;
        try { draft = JSON.parse(JSON.stringify(checkers)); } catch (e) { draft = []; }
        let editIndex = -1;

        const overlay = el('div',
            'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);'
            + 'display:flex;align-items:flex-start;justify-content:center;' + FONT);
        overlay.id = 'bili-composition-settings';

        const panel = el('div',
            'margin-top:6vh;width:min(680px,94vw);max-height:82vh;overflow:auto;background:#fff;color:#222;'
            + 'border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:16px 18px;');

        const header = el('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;');
        header.appendChild(el('div', 'font-size:16px;font-weight:700;', '成分检查设置'));
        const closeBtn = el('button', 'border:none;background:#eee;border-radius:6px;padding:4px 10px;cursor:pointer;', '关闭');
        closeBtn.addEventListener('click', function () { overlay.remove(); });
        header.appendChild(closeBtn);
        panel.appendChild(header);

        const optionsBox = el('div', 'margin-bottom:12px;padding:8px 10px;background:#f7f7f7;border-radius:8px;');
        function optionLine(text, checked) {
            const label = el('label', 'display:flex;align-items:center;gap:6px;margin:3px 0;');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = checked;
            label.appendChild(input);
            label.appendChild(document.createTextNode(text));
            return { label: label, input: input };
        }
        const followOption = optionLine('关注列表作为判断依据（关闭后只按动态关键词 / 粉丝牌判断）', options.useFollowings);
        const medalOption = optionLine('粉丝牌作为判断依据', options.useMedals);
        optionsBox.appendChild(followOption.label);
        optionsBox.appendChild(medalOption.label);
        panel.appendChild(optionsBox);

        const manualBox = el('div', 'margin-bottom:12px;padding:8px 10px;border:1px solid #eee;border-radius:8px;');
        manualBox.appendChild(el('div', 'font-weight:600;margin-bottom:6px;', '手动标签（按 UID）'));
        const manualRow = el('div', 'display:flex;gap:8px;flex-wrap:wrap;');
        const manualUid = el('input', 'flex:1;min-width:110px;padding:5px 8px;border:1px solid #ccc;border-radius:6px;');
        manualUid.placeholder = '用户 UID';
        const manualName = el('input', 'flex:1;min-width:110px;padding:5px 8px;border:1px solid #ccc;border-radius:6px;');
        manualName.placeholder = '标签名称';
        const manualAdd = el('button', 'border:none;background:#ff9800;color:#fff;border-radius:6px;padding:5px 12px;cursor:pointer;', '添加');
        manualRow.appendChild(manualUid);
        manualRow.appendChild(manualName);
        manualRow.appendChild(manualAdd);
        const manualList = el('div', 'margin-top:6px;');
        manualBox.appendChild(manualRow);
        manualBox.appendChild(manualList);
        panel.appendChild(manualBox);

        function renderManualList() {
            manualList.textContent = '';
            if (!manualTags.length) {
                manualList.appendChild(el('div', 'color:#888;', '暂无手动标签'));
                return;
            }
            manualTags.forEach(function (item) {
                const line = el('div', 'display:flex;align-items:center;gap:8px;padding:3px 0;');
                line.appendChild(el('div', 'flex:1;word-break:break-all;', item.uid + ' — ' + item.name));
                const del = el('button', 'border:none;background:#ffebee;color:#c62828;border-radius:6px;padding:2px 8px;cursor:pointer;', '删除');
                del.addEventListener('click', function () {
                    removeManualTag(item.uid, item.name);
                    renderManualList();
                });
                line.appendChild(del);
                manualList.appendChild(line);
            });
        }
        manualAdd.addEventListener('click', function () {
            if (addManualTag(manualUid.value.trim(), manualName.value.trim())) {
                manualUid.value = '';
                manualName.value = '';
                renderManualList();
            } else {
                manualList.appendChild(el('div', 'color:#e53935;', 'UID 必须是数字，标签不能为空且不能重复'));
                setTimeout(function () { renderManualList(); }, 2000);
            }
        });
        renderManualList();

        const listBox = el('div', 'margin-bottom:12px;');
        panel.appendChild(listBox);

        const form = el('div', 'border-top:1px solid #eee;padding-top:12px;');
        const fields = {};
        const fieldDefs = [
            ['displayName', '展示名称（必填）', '例如：原神'],
            ['displayIcon', '展示图标 URL（可选）', 'https://...'],
            ['keywords', '动态关键词（逗号分隔，可选）', '互动抽奖 #原神, 米哈游'],
            ['followings', 'UID（逗号分隔，可选）', '401742377, 1872522256']
        ];
        for (const [key, label, placeholder] of fieldDefs) {
            form.appendChild(el('label', 'display:block;margin:8px 0 4px;color:#555;', label));
            const input = el('input',
                'width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:6px;');
            input.placeholder = placeholder;
            fields[key] = input;
            form.appendChild(input);
        }

        const formActions = el('div', 'margin-top:10px;display:flex;gap:8px;');
        const saveItem = el('button',
            'border:none;background:#07beff;color:#04222e;border-radius:6px;padding:6px 14px;cursor:pointer;font-weight:600;',
            '保存检查项');
        const clearForm = el('button',
            'border:none;background:#eee;border-radius:6px;padding:6px 14px;cursor:pointer;', '清空编辑');
        formActions.appendChild(saveItem);
        formActions.appendChild(clearForm);
        form.appendChild(formActions);
        panel.appendChild(form);

        const tools = el('div', 'margin-top:14px;border-top:1px solid #eee;padding-top:12px;');
        const textarea = el('textarea',
            'width:100%;box-sizing:border-box;height:110px;padding:6px;border:1px solid #ccc;border-radius:6px;'
            + 'font:12px/1.5 Consolas,monospace;');
        textarea.placeholder = '在这里粘贴规则 JSON，然后点“导入”；“导出”会把当前规则写入这里';
        const toolActions = el('div', 'margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;');
        const exportBtn = el('button', 'border:none;background:#eee;border-radius:6px;padding:6px 12px;cursor:pointer;', '导出');
        const importBtn = el('button', 'border:none;background:#eee;border-radius:6px;padding:6px 12px;cursor:pointer;', '导入');
        const defaultBtn = el('button', 'border:none;background:#eee;border-radius:6px;padding:6px 12px;cursor:pointer;', '恢复默认');
        const applyBtn = el('button',
            'border:none;background:#4caf50;color:#fff;border-radius:6px;padding:6px 14px;cursor:pointer;margin-left:auto;',
            '应用并关闭');
        toolActions.appendChild(exportBtn);
        toolActions.appendChild(importBtn);
        toolActions.appendChild(defaultBtn);
        toolActions.appendChild(applyBtn);
        tools.appendChild(textarea);
        tools.appendChild(toolActions);
        panel.appendChild(tools);

        const message = el('div', 'margin-top:8px;color:#e53935;min-height:18px;');
        panel.appendChild(message);

        function renderList() {
            listBox.textContent = '';
            if (!draft.length) {
                listBox.appendChild(el('div', 'color:#888;', '暂无检查项'));
                return;
            }
            draft.forEach(function (checker, index) {
                const row = el('div', 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f0f0f0;');
                if (checker.displayIcon) {
                    const img = el('img', 'width:26px;height:26px;border-radius:50%;object-fit:cover;');
                    img.src = checker.displayIcon;
                    img.addEventListener('error', function () { img.style.visibility = 'hidden'; });
                    row.appendChild(img);
                }
                const info = el('div', 'flex:1;min-width:0;');
                info.appendChild(el('div', 'font-weight:600;', checker.displayName));
                info.appendChild(el('div', 'color:#888;font-size:12px;word-break:break-all;',
                    '关键词：' + (checker.keywords.join('、') || '无') + '；UID：' + (checker.followings.join('、') || '无')));
                row.appendChild(info);
                const edit = el('button', 'border:none;background:#e3f2fd;color:#1565c0;border-radius:6px;padding:3px 8px;cursor:pointer;', '编辑');
                const del = el('button', 'border:none;background:#ffebee;color:#c62828;border-radius:6px;padding:3px 8px;cursor:pointer;', '删除');
                edit.addEventListener('click', function () {
                    editIndex = index;
                    fields.displayName.value = checker.displayName;
                    fields.displayIcon.value = checker.displayIcon || '';
                    fields.keywords.value = (checker.keywords || []).join(', ');
                    fields.followings.value = (checker.followings || []).join(', ');
                    panel.scrollTop = 0;
                });
                del.addEventListener('click', function () {
                    draft.splice(index, 1);
                    editIndex = -1;
                    renderList();
                });
                row.appendChild(edit);
                row.appendChild(del);
                listBox.appendChild(row);
            });
        }

        function readKeywords(value) {
            return value.split(/[,，、\s]+/).map(function (part) { return part.trim(); }).filter(Boolean);
        }

        saveItem.addEventListener('click', function () {
            const displayName = fields.displayName.value.trim();
            if (!displayName) {
                message.textContent = '展示名称不能为空';
                return;
            }
            const checker = {
                displayName: displayName,
                displayIcon: fields.displayIcon.value.trim(),
                keywords: readKeywords(fields.keywords.value),
                followings: readKeywords(fields.followings.value)
                    .map(Number).filter(function (n) { return Number.isFinite(n); })
            };
            if (editIndex >= 0) draft[editIndex] = checker;
            else draft.push(checker);
            editIndex = -1;
            fields.displayName.value = '';
            fields.displayIcon.value = '';
            fields.keywords.value = '';
            fields.followings.value = '';
            message.textContent = '';
            renderList();
        });

        clearForm.addEventListener('click', function () {
            editIndex = -1;
            fields.displayName.value = '';
            fields.displayIcon.value = '';
            fields.keywords.value = '';
            fields.followings.value = '';
            message.textContent = '';
        });

        exportBtn.addEventListener('click', function () {
            textarea.value = JSON.stringify(draft, null, 2);
            message.textContent = '';
        });

        importBtn.addEventListener('click', function () {
            try {
                const parsed = sanitizeCheckers(JSON.parse(textarea.value));
                if (!parsed) {
                    message.textContent = '导入失败：内容不是有效的规则数组';
                    return;
                }
                draft = parsed;
                editIndex = -1;
                message.textContent = '';
                renderList();
            } catch (e) {
                message.textContent = '导入失败：' + (e.message || e);
            }
        });

        defaultBtn.addEventListener('click', function () {
            draft = JSON.parse(JSON.stringify(DEFAULT_CHECKERS));
            editIndex = -1;
            message.textContent = '';
            renderList();
        });

        applyBtn.addEventListener('click', function () {
            if (!draft.length) {
                message.textContent = '至少保留一个检查项';
                return;
            }
            options = {
                useFollowings: !!followOption.input.checked,
                useMedals: !!medalOption.input.checked
            };
            saveOptions();
            checkers = draft;
            saveCheckers();
            overlay.remove();
        });

        renderList();
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    }

    /* ---------------- 启动与调度 ---------------- */

    function scheduleScan() {
        if (scanScheduled) return;
        scanScheduled = true;
        setTimeout(function () {
            scanScheduled = false;
            try { scan(); } catch (e) { console.warn('[成分指示器] 扫描异常', e); }
        }, SCAN_DELAY);
    }

    function scan() {
        if (!document.body) return;
        const deep = Date.now() - lastDeepAt >= DEEP_SCAN_INTERVAL;
        if (deep) lastDeepAt = Date.now();
        const roots = collectRoots(deep);
        let candidatesFound = 0;
        let injected = 0;
        for (const root of roots) {
            if (!observedRoots.has(root)) {
                observedRoots.add(root);
                try {
                    new MutationObserver(scheduleScan).observe(root, { childList: true, subtree: true });
                } catch (e) {}
            }
            const candidates = findCandidates(root);
            candidatesFound += candidates.length;
            for (const candidate of candidates) {
                if (processed.has(candidate.el)) continue;
                processed.add(candidate.el);
                createBadge(candidate.el, candidate.uid);
                injected++;
            }
        }
        initSpacePanel();
        initUploaderPanel();
        if (debug) {
            console.debug('[成分指示器] 扫描', {
                deep: deep,
                roots: roots.length,
                candidates: candidatesFound,
                injected: injected
            });
        }
    }

    function init() {
        try { GM_registerMenuCommand('成分检查设置', openSettings); } catch (e) {}
        try {
            GM_registerMenuCommand('切换诊断日志（开/关）', function () { setDebug(!debug); });
        } catch (e) {}
        try {
            GM_registerMenuCommand('显示悬浮面板', function () {
                spacePanelClosed = false;
                uploaderPanelClosed = false;
                initSpacePanel();
                initUploaderPanel();
            });
        } catch (e) {}
        scan();
        setInterval(scheduleScan, SCAN_INTERVAL);
        window.addEventListener('load', scheduleScan);
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) scheduleScan();
        });
        try {
            const target = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            target.__BSPC__ = {
                version: '2.5.4',
                setDebug: setDebug,
                scan: scheduleScan,
                _createPanel: createFloatingPanel
            };
        } catch (e) {}
        console.info('[B站用户成分指示器] v2.5.4 已启动');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
