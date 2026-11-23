// ==UserScript==
// @name         B站用户成分指示器
// @namespace    https://github.com/klxf
// @version      2.6.8
// @description  适配新版评论区 Shadow DOM，支持远程规则库、游戏/主播库、可点击成分标签与粉丝牌名称匹配
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
// @connect      raw.githubusercontent.com
// @connect      ghproxy.net
// @downloadURL  https://ghproxy.net/https://raw.githubusercontent.com/Amazing-ikun/BilibiliUserChecker/main/Checker.user.js
// @updateURL    https://ghproxy.net/https://raw.githubusercontent.com/Amazing-ikun/BilibiliUserChecker/main/Checker.user.js
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
    const MANUAL_KEY = 'manual_tags_v2';
    const MANUAL_LEGACY_KEY = 'manual_tags_v1';
    const RULES_CACHE_KEY = 'rules_cache_v2';
    const RULES_MAX_AGE = 24 * 60 * 60 * 1000;
    const RULES_RETRY_AGE = 60 * 60 * 1000;
    const DEFAULT_RULES_URL = 'https://raw.githubusercontent.com/Amazing-ikun/BilibiliUserChecker/main/rules/rules.json';
    const DEFAULT_MIRROR = 'https://ghproxy.net/';
    const SOURCE_WEIGHTS = { dynamic: 3, medal: 3, decoration: 2, forward: 1, following: 1 };
    const DEFAULT_MIN_SCORE = 2;
    const RULES_PUBLIC_KEY_SPKI = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAECZar67UWwgkWVYYjSu6hgD3TRoFqeHd/DgqGxcqBZHmiPoLZYoxS2U9q73oj07IUKZnQRzyVKyTfjTTyxPKKlQ==';

    /* __EMBEDDED_RULES_START__ */
    const EMBEDDED_RULES = {"schema":1,"version":"2026.11.23","updatedAt":"2026-11-23","source":"list.txt + Bilibili card API","counts":{"total":238,"games":147,"streamers":91},"checkers":[{"displayName":"原神","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/853c4a846793dfbdafd8f16a40d6d8065bdb7c6f.jpg","keywords":["原神"],"followings":[401742377],"link":"https://space.bilibili.com/401742377","group":"开放世界 / 二次元 ARPG"},{"displayName":"崩坏星穹铁道","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/1336282f4138c9fd870fe75281de1441125a64c9.jpg","keywords":["崩坏星穹铁道"],"followings":[1340190821],"link":"https://space.bilibili.com/1340190821","group":"开放世界 / 二次元 ARPG"},{"displayName":"崩坏3","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/ea64c94cb3d76303d50e75b2b6006207e2a29f0a.jpg","keywords":["崩坏3"],"followings":[256667467],"link":"https://space.bilibili.com/256667467","group":"开放世界 / 二次元 ARPG"},{"displayName":"鸣潮","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/0abd6b9df304334a9388e968740b5b9b7d1a84be.jpg","keywords":["鸣潮"],"followings":[1955897084],"link":"https://space.bilibili.com/1955897084","group":"开放世界 / 二次元 ARPG"},{"displayName":"绝区零","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/f013e3aacdc4e3254a476648e1cec3f39b7df097.jpg","keywords":["绝区零"],"followings":[1636034895],"link":"https://space.bilibili.com/1636034895","group":"开放世界 / 二次元 ARPG"},{"displayName":"幻塔","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/ce12cc310dce7fa83eca1998e23996ddc2bf1085.jpg","keywords":["幻塔"],"followings":[586631367],"link":"https://space.bilibili.com/586631367","group":"开放世界 / 二次元 ARPG"},{"displayName":"无限暖暖","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/6b24f1f9c7e38563ac7b02ffcd10492908372b04.jpg","keywords":["无限暖暖"],"followings":[3461576715667734],"link":"https://space.bilibili.com/3461576715667734","group":"开放世界 / 二次元 ARPG"},{"displayName":"燕云十六声","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/4a2550ebcd14c456bce4ad423d35082afde073f6.jpg","keywords":["燕云十六声","燕云十六声官方"],"followings":[1567141152],"link":"https://space.bilibili.com/1567141152","group":"开放世界 / 二次元 ARPG","aliases":["燕云十六声官方"]},{"displayName":"归龙潮","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/68ab7487ce8826c9cb241872465363f4fe33ba79.jpg","keywords":["归龙潮"],"followings":[3461576967326521],"link":"https://space.bilibili.com/3461576967326521","group":"开放世界 / 二次元 ARPG"},{"displayName":"明日方舟：终末地","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/84152816c725e6d38128336d0f99d7c7c258cfa4.jpg","keywords":["明日方舟：终末地","明日方舟终末地"],"followings":[1265652806],"link":"https://space.bilibili.com/1265652806","group":"开放世界 / 二次元 ARPG"},{"displayName":"异环","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/5790579b2517b237df23d765719157ddf3537091.jpg","keywords":["异环"],"followings":[3546636978489848],"link":"https://space.bilibili.com/3546636978489848","group":"开放世界 / 二次元 ARPG"},{"displayName":"洛克王国：世界","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/471e5b6c7024c5caff82109e26145c7ccc73661d.jpg","keywords":["洛克王国：世界","洛克王国世界"],"followings":[626796832],"link":"https://space.bilibili.com/626796832","group":"开放世界 / 二次元 ARPG"},{"displayName":"王者荣耀世界","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/01e64cba2b9857bdcfb0920959bdb16eccb0e390.jpg","keywords":["王者荣耀世界"],"followings":[57435565],"link":"https://space.bilibili.com/57435565","group":"开放世界 / 二次元 ARPG"},{"displayName":"战双帕弥什","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/29d40886bc649fd2b81793c17077728820d411b6.jpg","keywords":["战双帕弥什"],"followings":[382651856],"link":"https://space.bilibili.com/382651856","group":"开放世界 / 二次元 ARPG"},{"displayName":"深空之眼","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/a03960714a3ed5e744ba791e0bcfd1bdbab0e6ce.jpg","keywords":["深空之眼","深空之眼手游"],"followings":[471259688],"link":"https://space.bilibili.com/471259688","group":"开放世界 / 二次元 ARPG","aliases":["深空之眼手游"]},{"displayName":"崩坏学园2","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/7f7a98360928ba0339881b4a4caa39af68d3618d.jpg","keywords":["崩坏学园2","崩坏学园2-灵依娘desu"],"followings":[133934],"link":"https://space.bilibili.com/133934","group":"开放世界 / 二次元 ARPG","aliases":["崩坏学园2-灵依娘desu"]},{"displayName":"明日方舟","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/d4005a0f9b898d8bb049caf9c6355f8e8f772a8f.jpg","keywords":["明日方舟"],"followings":[161775300],"link":"https://space.bilibili.com/161775300","group":"二次元卡牌 / 策略"},{"displayName":"重返未来：1999","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/6a1936d5cb5b315311fedbf2d4793c4d404cac83.jpg","keywords":["重返未来：1999","重返未来1999"],"followings":[1197454103],"link":"https://space.bilibili.com/1197454103","group":"二次元卡牌 / 策略"},{"displayName":"少女前线2：追放","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/f1180b40e928f9c50c156845480d2871bfb8a4e9.jpg","keywords":["少女前线2：追放","少女前线2-追放制作组"],"followings":[697654195],"link":"https://space.bilibili.com/697654195","group":"二次元卡牌 / 策略","aliases":["少女前线2-追放制作组"]},{"displayName":"少女前线","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/667e4b1ca39300bff0672774f1980c02c2353b11.jpg","keywords":["少女前线","少女前线制作组"],"followings":[32472953],"link":"https://space.bilibili.com/32472953","group":"二次元卡牌 / 策略","aliases":["少女前线制作组"]},{"displayName":"碧蓝航线","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/c6af5327e1c8a53ede6d0de048edf407bcf052ac.jpg","keywords":["碧蓝航线"],"followings":[233114659],"link":"https://space.bilibili.com/233114659","group":"二次元卡牌 / 策略"},{"displayName":"蔚蓝档案","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/f2635e09fe667d4ad29229c6ed0b5f4bdea09bd1.jpg","keywords":["蔚蓝档案"],"followings":[3493265644980448],"link":"https://space.bilibili.com/3493265644980448","group":"二次元卡牌 / 策略"},{"displayName":"公主连结Re:Dive","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/48f58eaed2f5d51d37bb5499ebdabefece63a587.jpg","keywords":["公主连结Re:Dive","公主连结ReDive"],"followings":[353840826],"link":"https://space.bilibili.com/353840826","group":"二次元卡牌 / 策略"},{"displayName":"无期迷途","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/77cffb34e26a327f2e6e862158519c2b221bc915.jpg","keywords":["无期迷途"],"followings":[647409444],"link":"https://space.bilibili.com/647409444","group":"二次元卡牌 / 策略"},{"displayName":"白荆回廊","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/b1343f27ad2e26a867a0f158a33e372c9bf4556a.jpg","keywords":["白荆回廊"],"followings":[1881796598],"link":"https://space.bilibili.com/1881796598","group":"二次元卡牌 / 策略"},{"displayName":"千年之旅","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/3d9f7a8580175d85f699703fbc1ba894c08945dc.jpg","keywords":["千年之旅","千年之旅ELF制作组"],"followings":[3546597226973705],"link":"https://space.bilibili.com/3546597226973705","group":"二次元卡牌 / 策略","aliases":["千年之旅ELF制作组"]},{"displayName":"交错战线","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/567823d8e974022e0a7f1509d7ae16cbc2d13fa7.jpg","keywords":["交错战线"],"followings":[701179700],"link":"https://space.bilibili.com/701179700","group":"二次元卡牌 / 策略"},{"displayName":"绯色回响","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/386524bf022e2ccd8f389e42fd2878a5d2b1b5ac.jpg","keywords":["绯色回响"],"followings":[1257166314],"link":"https://space.bilibili.com/1257166314","group":"二次元卡牌 / 策略"},{"displayName":"铃兰之剑","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/e3be5a2816fb9a516e1d1c1f1a43d75374941e32.jpg","keywords":["铃兰之剑"],"followings":[1581329897],"link":"https://space.bilibili.com/1581329897","group":"二次元卡牌 / 策略"},{"displayName":"第七史诗","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/b0f46e1973a966697133816d8ec8277b0720dd8d.jpg","keywords":["第七史诗"],"followings":[2136569666],"link":"https://space.bilibili.com/2136569666","group":"二次元卡牌 / 策略"},{"displayName":"世界弹射物语","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/7c85f10bd2cdcb35b7e554d17bd74b8cffa50417.jpg","keywords":["世界弹射物语"],"followings":[1365027097],"link":"https://space.bilibili.com/1365027097","group":"二次元卡牌 / 策略"},{"displayName":"阴阳师","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/caa4cd25e78d7264aecb19bf4bb6914bc1111453.jpg","keywords":["阴阳师","网易阴阳师手游"],"followings":[30973654],"link":"https://space.bilibili.com/30973654","group":"二次元卡牌 / 策略","aliases":["网易阴阳师手游"]},{"displayName":"阴阳师：百闻牌","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/32c8cab0dfbc7a740475543b500dd9102e2c1157.jpg","keywords":["阴阳师：百闻牌","阴阳师百闻牌"],"followings":[431646218],"link":"https://space.bilibili.com/431646218","group":"二次元卡牌 / 策略"},{"displayName":"剑与远征","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/53f3d3efd8453542128aa7acc39c8b1c28faecb8.jpg","keywords":["剑与远征"],"followings":[396708168],"link":"https://space.bilibili.com/396708168","group":"二次元卡牌 / 策略"},{"displayName":"剑与远征：启程","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/c914f118ea7be9a3ed9a3c7333100d26e8027f25.jpg","keywords":["剑与远征：启程","剑与远征启程"],"followings":[3493138475780593],"link":"https://space.bilibili.com/3493138475780593","group":"二次元卡牌 / 策略"},{"displayName":"小冰冰传奇","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/29857017a8ee09fbe4f68c45aecafdecbaae8eda.jpg","keywords":["小冰冰传奇","小冰冰传奇手游"],"followings":[481427597],"link":"https://space.bilibili.com/481427597","group":"二次元卡牌 / 策略","aliases":["小冰冰传奇手游"]},{"displayName":"寻道大千","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/42792821b2dab7ec7a3ea4348cfdfcd63017b806.jpg","keywords":["寻道大千"],"followings":[3546669064915023],"link":"https://space.bilibili.com/3546669064915023","group":"二次元卡牌 / 策略"},{"displayName":"炉石传说","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/8b725bae8ac20914c21e70f3bdec75a64f4e710d.jpg","keywords":["炉石传说"],"followings":[3546810597509464],"link":"https://space.bilibili.com/3546810597509464","group":"二次元卡牌 / 策略"},{"displayName":"影之诗","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/5a7e3e53d882ce0a566cc69d93f5367558f9886f.jpg","keywords":["影之诗","影之诗调戏专员"],"followings":[14553873],"link":"https://space.bilibili.com/14553873","group":"二次元卡牌 / 策略","aliases":["影之诗调戏专员"]},{"displayName":"游戏王：决斗链接","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/8d775af02beac3788fedd9accdaec90e9453cd3f.jpg","keywords":["游戏王：决斗链接","游戏王决斗链接"],"followings":[366511662],"link":"https://space.bilibili.com/366511662","group":"二次元卡牌 / 策略"},{"displayName":"三国杀","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/53f3ea77172036fba4d70fb0945abe6738349779.jpg","keywords":["三国杀"],"followings":[587050283],"link":"https://space.bilibili.com/587050283","group":"二次元卡牌 / 策略"},{"displayName":"率土之滨","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/090c9e4146c7a8f2feba6ff890e2930d52b53539.jpg","keywords":["率土之滨","网易率土之滨手游"],"followings":[401542445],"link":"https://space.bilibili.com/401542445","group":"二次元卡牌 / 策略","aliases":["网易率土之滨手游"]},{"displayName":"万国觉醒","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/f8cfbaa23b12c61726c08fc4668b313daa71eaae.jpg","keywords":["万国觉醒"],"followings":[438322680],"link":"https://space.bilibili.com/438322680","group":"二次元卡牌 / 策略"},{"displayName":"金铲铲之战","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/ecacbb92e54cd7e12dab8a7e22284492f3322c0f.jpg","keywords":["金铲铲之战"],"followings":[602664449],"link":"https://space.bilibili.com/602664449","group":"二次元卡牌 / 策略"},{"displayName":"皇室战争","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/f72f3add0f55d4418af5f647661ab4d8b4d8e7cc.jpg","keywords":["皇室战争","皇室战争ClashRoyale"],"followings":[506971765],"link":"https://space.bilibili.com/506971765","group":"二次元卡牌 / 策略","aliases":["皇室战争ClashRoyale"]},{"displayName":"部落冲突","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/10fe635f7b2eba2476817b869b21928f5d099224.jpg","keywords":["部落冲突","部落冲突ClashofClans"],"followings":[510467240],"link":"https://space.bilibili.com/510467240","group":"二次元卡牌 / 策略","aliases":["部落冲突ClashofClans"]},{"displayName":"星际争霸2","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/805c51051fa1deb0225bf40d595e0028a7826c23.jpg","keywords":["星际争霸2","星际争霸官方"],"followings":[3690971380320878],"link":"https://space.bilibili.com/3690971380320878","group":"二次元卡牌 / 策略","aliases":["星际争霸官方"]},{"displayName":"恋与制作人","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/53430e94de5ad8be7d7730bc3a91b7364e6b3afc.jpg","keywords":["恋与制作人"],"followings":[80696429],"link":"https://space.bilibili.com/80696429","group":"女性向 / 恋爱养成"},{"displayName":"恋与深空","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/5fcfd9a429bcd5c29dafa8d85ee87d54148be8f0.jpg","keywords":["恋与深空"],"followings":[699603717],"link":"https://space.bilibili.com/699603717","group":"女性向 / 恋爱养成"},{"displayName":"未定事件簿","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/94ecf02d06cde37f1343bc72fceaafa3f46a302d.jpg","keywords":["未定事件簿"],"followings":[436175352],"link":"https://space.bilibili.com/436175352","group":"女性向 / 恋爱养成"},{"displayName":"光与夜之恋","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/0878288368f6aa2e9df48939eab36b15b33d5da6.jpg","keywords":["光与夜之恋"],"followings":[434391603],"link":"https://space.bilibili.com/434391603","group":"女性向 / 恋爱养成"},{"displayName":"时空中的绘旅人","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/076f1e6cc103824ee0b806477b8971592769c815.jpg","keywords":["时空中的绘旅人"],"followings":[441833336],"link":"https://space.bilibili.com/441833336","group":"女性向 / 恋爱养成"},{"displayName":"花亦山心之月","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/47dfd9fcde3267d83414b7aa56847551a1cfd56a.jpg","keywords":["花亦山心之月"],"followings":[689955536],"link":"https://space.bilibili.com/689955536","group":"女性向 / 恋爱养成"},{"displayName":"世界之外","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/f088075699c0b408cd0ee53220ef89a39d78cc70.jpg","keywords":["世界之外","世界之外官方"],"followings":[1597187158],"link":"https://space.bilibili.com/1597187158","group":"女性向 / 恋爱养成","aliases":["世界之外官方"]},{"displayName":"食物语","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/378126f0aed1a35ebdbf9881463af750b2e514ae.jpg","keywords":["食物语"],"followings":[284971783],"link":"https://space.bilibili.com/284971783","group":"女性向 / 恋爱养成"},{"displayName":"闪耀！优俊少女","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/bab0c5ad2304bb6ca259bbb2ff62897da5464a22.jpg","keywords":["闪耀！优俊少女","闪耀优俊少女"],"followings":[3461579184015582],"link":"https://space.bilibili.com/3461579184015582","group":"女性向 / 恋爱养成"},{"displayName":"偶像梦幻祭2","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/aab5cb383b05fc2e90f47460db2ea8a0c906b5a1.jpg","keywords":["偶像梦幻祭2","偶像梦幻祭2助理君"],"followings":[482477042],"link":"https://space.bilibili.com/482477042","group":"女性向 / 恋爱养成","aliases":["偶像梦幻祭2助理君"]},{"displayName":"闪耀暖暖","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/9848e71438fb706329159ec76ab6d859c23c8598.jpg","keywords":["闪耀暖暖"],"followings":[303469491],"link":"https://space.bilibili.com/303469491","group":"女性向 / 恋爱养成"},{"displayName":"奇迹暖暖","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/a7bfb68140ef6160dec83d698bf04392d7930eee.jpg","keywords":["奇迹暖暖","Nikki_奇迹暖暖"],"followings":[37478304],"link":"https://space.bilibili.com/37478304","group":"女性向 / 恋爱养成","aliases":["Nikki_奇迹暖暖"]},{"displayName":"以闪亮之名","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/8976deb415a1d8dd9836e714a42e49ee3014778a.jpg","keywords":["以闪亮之名"],"followings":[676200579],"link":"https://space.bilibili.com/676200579","group":"女性向 / 恋爱养成"},{"displayName":"王者荣耀","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/ee54c4776e38fcad7da2a3489e4b7566880443ea.jpg","keywords":["王者荣耀"],"followings":[57863910],"link":"https://space.bilibili.com/57863910","group":"MOBA / 竞技 / 派对"},{"displayName":"英雄联盟","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/f191be16d6b0087ecac4a907d9418c2c38745792.jpg","keywords":["英雄联盟"],"followings":[178778949],"link":"https://space.bilibili.com/178778949","group":"MOBA / 竞技 / 派对"},{"displayName":"英雄联盟手游","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/e2369ac89566f09d2ecc882c942e8d07086d46d7.jpg","keywords":["英雄联盟手游"],"followings":[473940554],"link":"https://space.bilibili.com/473940554","group":"MOBA / 竞技 / 派对"},{"displayName":"决战！平安京","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/1ca77cd71228e726bb98ecce434529ebcf93c754.jpg","keywords":["决战！平安京","决战平安京官方"],"followings":[267637532],"link":"https://space.bilibili.com/267637532","group":"MOBA / 竞技 / 派对","aliases":["决战平安京官方"]},{"displayName":"曙光英雄","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/a7e65c9b4f2f81b3e307fbd8a183ec0a71040e58.jpg","keywords":["曙光英雄"],"followings":[470933781],"link":"https://space.bilibili.com/470933781","group":"MOBA / 竞技 / 派对"},{"displayName":"300英雄","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/5c077cdf2afeebdf7936406b46ab70114a8bdcf0.jpg","keywords":["300英雄","300英雄官方"],"followings":[117181240],"link":"https://space.bilibili.com/117181240","group":"MOBA / 竞技 / 派对","aliases":["300英雄官方"]},{"displayName":"非人学园","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/25bec491124cb3477668c678c56bc572f20bb919.jpg","keywords":["非人学园"],"followings":[223289804],"link":"https://space.bilibili.com/223289804","group":"MOBA / 竞技 / 派对"},{"displayName":"宝可梦大集结","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/aca35edad517a241b565398cad70f19d0abc06da.jpg","keywords":["宝可梦大集结"],"followings":[619792510],"link":"https://space.bilibili.com/619792510","group":"MOBA / 竞技 / 派对"},{"displayName":"荒野乱斗","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/3d3a980a37a0e8984fca8257632abd12abc85c3d.jpg","keywords":["荒野乱斗","荒野乱斗BrawlStars"],"followings":[429714179],"link":"https://space.bilibili.com/429714179","group":"MOBA / 竞技 / 派对","aliases":["荒野乱斗BrawlStars"]},{"displayName":"永劫无间","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/3a73220e3dcd153636aeb79a6e6862ac8a9f59c7.jpg","keywords":["永劫无间","永劫无间官方"],"followings":[349984754],"link":"https://space.bilibili.com/349984754","group":"MOBA / 竞技 / 派对","aliases":["永劫无间官方"]},{"displayName":"蛋仔派对","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/3731e77ae47814fb73c58fef543680604104ef58.jpg","keywords":["蛋仔派对","网易蛋仔派对"],"followings":[1306451842],"link":"https://space.bilibili.com/1306451842","group":"MOBA / 竞技 / 派对","aliases":["网易蛋仔派对"]},{"displayName":"元梦之星","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/5a1e04f8ae0d514d237475b80fd5715e64abac6d.jpg","keywords":["元梦之星"],"followings":[3494368275073228],"link":"https://space.bilibili.com/3494368275073228","group":"MOBA / 竞技 / 派对"},{"displayName":"和平精英","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/8152b9af2954665e532030ecbcf90704f735e242.jpg","keywords":["和平精英"],"followings":[434786180],"link":"https://space.bilibili.com/434786180","group":"射击游戏"},{"displayName":"穿越火线","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/27cb3e8c556c03c0059dd1ab0ad2da47e7c100b6.jpg","keywords":["穿越火线"],"followings":[315554376],"link":"https://space.bilibili.com/315554376","group":"射击游戏"},{"displayName":"无畏契约","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/56a704e88f4cf3e45c2b4fffb09d62d998e2a6f5.jpg","keywords":["无畏契约"],"followings":[147546636],"link":"https://space.bilibili.com/147546636","group":"射击游戏"},{"displayName":"使命召唤手游","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/5f055bd19f507ee33cffb77188126005f8cc9836.jpg","keywords":["使命召唤手游","使命召唤手游官方"],"followings":[417296980],"link":"https://space.bilibili.com/417296980","group":"射击游戏","aliases":["使命召唤手游官方"]},{"displayName":"三角洲行动","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/d990fa3fa3efd36282de2cf0b9da75874ce95e69.jpg","keywords":["三角洲行动"],"followings":[3494376565115651],"link":"https://space.bilibili.com/3494376565115651","group":"射击游戏"},{"displayName":"暗区突围","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/1b88357baa2eb4e024925757955b9819a2217827.jpg","keywords":["暗区突围"],"followings":[1915056903],"link":"https://space.bilibili.com/1915056903","group":"射击游戏"},{"displayName":"逆战","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/3783cfefd3d18ebe4396ed5b563019d0538caeb2.jpg","keywords":["逆战"],"followings":[1091536370],"link":"https://space.bilibili.com/1091536370","group":"射击游戏"},{"displayName":"生死狙击2","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/002fa8cd175c1138f63f0cfe54a92a7ddf52454f.jpg","keywords":["生死狙击2","生死狙击2官方"],"followings":[384306796],"link":"https://space.bilibili.com/384306796","group":"射击游戏","aliases":["生死狙击2官方"]},{"displayName":"守望先锋","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/07c89741417a2b713701716fa22847c185d54c2f.jpg","keywords":["守望先锋"],"followings":[1886758040],"link":"https://space.bilibili.com/1886758040","group":"射击游戏"},{"displayName":"Apex英雄","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/61f00448d8b97d60525a9d38d87029274a220e19.jpg","keywords":["Apex英雄","APEX英雄"],"followings":[3461581662849732],"link":"https://space.bilibili.com/3461581662849732","group":"射击游戏"},{"displayName":"高能英雄","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/e74dc55c55b90b1c6f57744603307a189089932e.jpg","keywords":["高能英雄"],"followings":[1000185818],"link":"https://space.bilibili.com/1000185818","group":"射击游戏"},{"displayName":"绝地潜兵2","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/82d3e41bb58fae035d83110ce872818c46802d6f.jpg","keywords":["绝地潜兵2","绝地潜兵官方"],"followings":[3546624963906339],"link":"https://space.bilibili.com/3546624963906339","group":"射击游戏","aliases":["绝地潜兵官方"]},{"displayName":"战地风云","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/b6f88aa1c4addf29e654245d364d6bfcd3e1b274.jpg","keywords":["战地风云","战地风云Battlefield"],"followings":[381399962],"link":"https://space.bilibili.com/381399962","group":"射击游戏","aliases":["战地风云Battlefield"]},{"displayName":"命运2","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/adcf5f71a2be52990b044eb49708a2c78375d9e6.jpg","keywords":["命运2","命运2官方"],"followings":[491424921],"link":"https://space.bilibili.com/491424921","group":"射击游戏","aliases":["命运2官方"]},{"displayName":"坦克世界","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/1331c9363edfdf606657708c4bd0d6427c74278d.jpg","keywords":["坦克世界","坦克世界官方账号"],"followings":[597903167],"link":"https://space.bilibili.com/597903167","group":"射击游戏","aliases":["坦克世界官方账号"]},{"displayName":"战舰世界","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/ec836ff106f043f0d8b533327c66706a0dc62131.jpg","keywords":["战舰世界","战舰世界_Official"],"followings":[573693898],"link":"https://space.bilibili.com/573693898","group":"射击游戏","aliases":["战舰世界_Official"]},{"displayName":"尘白禁区","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/e2a7e30399860cfa7c1ec5c958ab9e519290e181.jpg","keywords":["尘白禁区"],"followings":[1409863611],"link":"https://space.bilibili.com/1409863611","group":"射击游戏"},{"displayName":"卡拉彼丘","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/3a35c89a8f732e3f1e2819f82c9188654cc70d46.jpg","keywords":["卡拉彼丘"],"followings":[660091334],"link":"https://space.bilibili.com/660091334","group":"射击游戏"},{"displayName":"我的世界","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/d60554ad2ea485fd4e99fbd7173c01cdd1678f46.jpg","keywords":["我的世界","Minecraft我的世界官方"],"followings":[43310262],"link":"https://space.bilibili.com/43310262","group":"沙盒 / 生存 / 建造","aliases":["Minecraft我的世界官方"]},{"displayName":"迷你世界","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/7f6e8a74736e525b869346b4bcf796767590a423.jpg","keywords":["迷你世界","迷你世界官方频道"],"followings":[470935187],"link":"https://space.bilibili.com/470935187","group":"沙盒 / 生存 / 建造","aliases":["迷你世界官方频道"]},{"displayName":"方舟：生存进化","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/3b1d6e21a599eef6b5f273861fddfb62092da8d9.jpg","keywords":["方舟：生存进化","方舟生存进化官方"],"followings":[3537120020924649],"link":"https://space.bilibili.com/3537120020924649","group":"沙盒 / 生存 / 建造","aliases":["方舟生存进化官方"]},{"displayName":"雾锁王国","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/dce5c7f7ee8251224d254ed806d5d26c0c097b01.jpg","keywords":["雾锁王国"],"followings":[3546571872405900],"link":"https://space.bilibili.com/3546571872405900","group":"沙盒 / 生存 / 建造"},{"displayName":"英灵神殿","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/8cc8c6e9226df8efea83ea5b5bdfcc2fac1de680.jpg","keywords":["英灵神殿","英灵神殿官方账号"],"followings":[1602714022],"link":"https://space.bilibili.com/1602714022","group":"沙盒 / 生存 / 建造","aliases":["英灵神殿官方账号"]},{"displayName":"戴森球计划","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/0fa39626bd4c59c17962ff1f6fba75c3418e7802.jpg","keywords":["戴森球计划","戴森球计划制作组"],"followings":[481714350],"link":"https://space.bilibili.com/481714350","group":"沙盒 / 生存 / 建造","aliases":["戴森球计划制作组"]},{"displayName":"第五人格","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/276345b81b94bcbbf7c7c95510f02226c5bdd696.jpg","keywords":["第五人格","网易第五人格手游"],"followings":[211005705],"link":"https://space.bilibili.com/211005705","group":"非对称对抗 / 恐怖","aliases":["网易第五人格手游"]},{"displayName":"黎明杀机","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/0c5ff6a34f79007f733b3aa2d0701507f8aad5de.jpg","keywords":["黎明杀机","黎明杀机官方"],"followings":[217194491],"link":"https://space.bilibili.com/217194491","group":"非对称对抗 / 恐怖","aliases":["黎明杀机官方"]},{"displayName":"猫和老鼠","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/3c5f70058f00b2b96076a3baaadcec3c2d75ad36.jpg","keywords":["猫和老鼠","猫和老鼠官方手游"],"followings":[298683153],"link":"https://space.bilibili.com/298683153","group":"非对称对抗 / 恐怖","aliases":["猫和老鼠官方手游"]},{"displayName":"逃跑吧！少年","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/49777f06d503a636d3f36d56b6b334413b091bbc.jpg","keywords":["逃跑吧！少年","逃跑吧少年官方"],"followings":[1289045338],"link":"https://space.bilibili.com/1289045338","group":"非对称对抗 / 恐怖","aliases":["逃跑吧少年官方"]},{"displayName":"太空杀","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/27fe78b434f060389b403c7d1ffa4b990ca3650e.jpg","keywords":["太空杀"],"followings":[2013536072],"link":"https://space.bilibili.com/2013536072","group":"非对称对抗 / 恐怖"},{"displayName":"纸嫁衣","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/dd7670d66611749413586729ea992e87cf081e01.jpg","keywords":["纸嫁衣","纸嫁衣官方"],"followings":[1871737115],"link":"https://space.bilibili.com/1871737115","group":"非对称对抗 / 恐怖","aliases":["纸嫁衣官方"]},{"displayName":"魔兽世界","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/fe6c8e379c38bb6557fd66ef81d7652ef2fd6a44.jpg","keywords":["魔兽世界"],"followings":[2929048],"link":"https://space.bilibili.com/2929048","group":"MMORPG / 网游"},{"displayName":"最终幻想14","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/5835cc6c07211020fb9cd92d000ecf9b17c5ae06.jpg","keywords":["最终幻想14","最终幻想14官方"],"followings":[6655514],"link":"https://space.bilibili.com/6655514","group":"MMORPG / 网游","aliases":["最终幻想14官方"]},{"displayName":"古剑奇谭网络版","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/e661774d3defcefc1c8f2aa1236d820b6825f8ff.jpg","keywords":["古剑奇谭网络版","古剑奇谭网络版官方"],"followings":[344993379],"link":"https://space.bilibili.com/344993379","group":"MMORPG / 网游","aliases":["古剑奇谭网络版官方"]},{"displayName":"暗黑破坏神：不朽","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/10293d4fca45879e0a494527ce928e0afa4b9b21.jpg","keywords":["暗黑破坏神：不朽","暗黑破坏神-不朽"],"followings":[385301930],"link":"https://space.bilibili.com/385301930","group":"MMORPG / 网游"},{"displayName":"流放之路","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/3b0edebd931fa603e70e457a5a011f2a464c4e16.jpg","keywords":["流放之路","流放之路官方号"],"followings":[349713519],"link":"https://space.bilibili.com/349713519","group":"MMORPG / 网游","aliases":["流放之路官方号"]},{"displayName":"火炬之光：无限","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/0970c5c5a7ea3bcecb881671325f891c6c5c44ac.jpg","keywords":["火炬之光：无限","火炬之光无限官方"],"followings":[1031698953],"link":"https://space.bilibili.com/1031698953","group":"MMORPG / 网游","aliases":["火炬之光无限官方"]},{"displayName":"黑色沙漠","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/e409f93a06c213400b32c9ac014bf4f56e7966a0.jpg","keywords":["黑色沙漠","黑色沙漠手游"],"followings":[1419049119],"link":"https://space.bilibili.com/1419049119","group":"MMORPG / 网游","aliases":["黑色沙漠手游"]},{"displayName":"命运方舟","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/7bae36b2793e0e369f3006d86ea26e33db5445ad.jpg","keywords":["命运方舟","命运方舟LOSTARK"],"followings":[1032936971],"link":"https://space.bilibili.com/1032936971","group":"MMORPG / 网游","aliases":["命运方舟LOSTARK"]},{"displayName":"地下城与勇士","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/ebcd3429874aef3af8b621264f181fb69f8b7666.jpg","keywords":["地下城与勇士"],"followings":[102176172],"link":"https://space.bilibili.com/102176172","group":"MMORPG / 网游"},{"displayName":"龙之谷","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/95c78c4b0729ef57140f00e5eeaf89e4100b87f2.jpg","keywords":["龙之谷","龙之谷官方"],"followings":[463440],"link":"https://space.bilibili.com/463440","group":"MMORPG / 网游","aliases":["龙之谷官方"]},{"displayName":"剑灵","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/1571f9b234aebe56878d94687ee381d13797d011.jpg","keywords":["剑灵"],"followings":[406524780],"link":"https://space.bilibili.com/406524780","group":"MMORPG / 网游"},{"displayName":"永恒之塔","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/8ca1f5c7b50cd8fe0569ad8f1227bac91f4903be.jpg","keywords":["永恒之塔","永恒之塔官方"],"followings":[477325649],"link":"https://space.bilibili.com/477325649","group":"MMORPG / 网游","aliases":["永恒之塔官方"]},{"displayName":"梦幻西游","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/dd54aff29caac79baa10b18892e61ae9aabf7ce9.jpg","keywords":["梦幻西游","梦幻西游电脑版"],"followings":[444935584],"link":"https://space.bilibili.com/444935584","group":"MMORPG / 网游","aliases":["梦幻西游电脑版"]},{"displayName":"大话西游2","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/3d08c99161c6d9d3f4f86ce6f25f2b023dfc9931.jpg","keywords":["大话西游2","大话西游2官方"],"followings":[188817452],"link":"https://space.bilibili.com/188817452","group":"MMORPG / 网游","aliases":["大话西游2官方"]},{"displayName":"问道","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/fe76e8c206a3ee22b5490e0dc2c712de3ebe09b4.jpg","keywords":["问道","问道手游官方账号"],"followings":[1797434378],"link":"https://space.bilibili.com/1797434378","group":"MMORPG / 网游","aliases":["问道手游官方账号"]},{"displayName":"倩女幽魂","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/c2650e488a0e3c02481e77c6bf7d4741f06f686e.jpg","keywords":["倩女幽魂","倩女幽魂手游菌"],"followings":[324505126],"link":"https://space.bilibili.com/324505126","group":"MMORPG / 网游","aliases":["倩女幽魂手游菌"]},{"displayName":"彩虹岛","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/4ce28783959dc55e9075f3a996169a1e16fb2b09.jpg","keywords":["彩虹岛","彩虹岛官方账号"],"followings":[163117452],"link":"https://space.bilibili.com/163117452","group":"MMORPG / 网游","aliases":["彩虹岛官方账号"]},{"displayName":"天涯明月刀OL","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/57948633c35f7553519314c3376f52011a6c3548.jpg","keywords":["天涯明月刀OL","天涯明月刀OL官方"],"followings":[33600515],"link":"https://space.bilibili.com/33600515","group":"MMORPG / 网游","aliases":["天涯明月刀OL官方"]},{"displayName":"天涯明月刀手游","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/b4081d483d4425d1c56c1e14c768ac3f988efef0.jpg","keywords":["天涯明月刀手游"],"followings":[431880410],"link":"https://space.bilibili.com/431880410","group":"MMORPG / 网游"},{"displayName":"逆水寒","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/a1b9049256db3dc5a2ddeb13b591144b4e8f3861.jpg","keywords":["逆水寒","网易逆水寒"],"followings":[21619102],"link":"https://space.bilibili.com/21619102","group":"MMORPG / 网游","aliases":["网易逆水寒"]},{"displayName":"剑网3","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/c1bda6c1ec9240c59f6985c1f0e34742bec8647c.jpg","keywords":["剑网3"],"followings":[7005369],"link":"https://space.bilibili.com/7005369","group":"MMORPG / 网游"},{"displayName":"一梦江湖","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/fbe93b130bab1da69d92d14d9796ed966f17b4b7.jpg","keywords":["一梦江湖","网易一梦江湖官方"],"followings":[177976892],"link":"https://space.bilibili.com/177976892","group":"MMORPG / 网游","aliases":["网易一梦江湖官方"]},{"displayName":"潜水员戴夫","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/87b912f2c6c920a3e4151369b7506158e830798f.jpg","keywords":["潜水员戴夫","潜水员戴夫官方"],"followings":[1719904184],"link":"https://space.bilibili.com/1719904184","group":"单机大作","aliases":["潜水员戴夫官方"]},{"displayName":"明末：渊虚之羽","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/36f48827823f212aa87cd7dd406fa990c16bb6e3.jpg","keywords":["明末：渊虚之羽","明末渊虚之羽"],"followings":[1277622605],"link":"https://space.bilibili.com/1277622605","group":"单机大作"},{"displayName":"极品飞车：集结","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/ee4866b2f3e7d08849754aedbb9b1da2f35417b8.jpg","keywords":["极品飞车：集结","极品飞车集结"],"followings":[3537109822474581],"link":"https://space.bilibili.com/3537109822474581","group":"竞速 / 体育 / 模拟 / 音游"},{"displayName":"QQ飞车","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/efd9a839d46873d198b714b9f62793511f079f5b.jpg","keywords":["QQ飞车","QQ飞车手游"],"followings":[327753090],"link":"https://space.bilibili.com/327753090","group":"竞速 / 体育 / 模拟 / 音游","aliases":["QQ飞车手游"]},{"displayName":"跑跑卡丁车官方竞速版","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/5f1a1defce1eb698f0f33c7e8f954f0744b83e86.jpg","keywords":["跑跑卡丁车官方竞速版"],"followings":[394618791],"link":"https://space.bilibili.com/394618791","group":"竞速 / 体育 / 模拟 / 音游"},{"displayName":"实况足球手游","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/4a1aae4b92dc24f42ec7fce5a83e98fcb7ccdbc0.jpg","keywords":["实况足球手游","实况足球手游官方"],"followings":[404828731],"link":"https://space.bilibili.com/404828731","group":"竞速 / 体育 / 模拟 / 音游","aliases":["实况足球手游官方"]},{"displayName":"节奏大师","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/81b61cd376abd5749690fba95660ee6a1a6689ff.jpg","keywords":["节奏大师","节奏大师手游"],"followings":[3546568116406964],"link":"https://space.bilibili.com/3546568116406964","group":"竞速 / 体育 / 模拟 / 音游","aliases":["节奏大师手游"]},{"displayName":"喵斯快跑","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/6326d7292bf1065d48260917a147e3798b8ad879.jpg","keywords":["喵斯快跑","MuseDash_喵斯快跑"],"followings":[269396974],"link":"https://space.bilibili.com/269396974","group":"竞速 / 体育 / 模拟 / 音游","aliases":["MuseDash_喵斯快跑"]},{"displayName":"Phigros","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/d430815390652747be3fd87255915ce439e713bd.jpg","keywords":["Phigros","Phigros官方"],"followings":[414149787],"link":"https://space.bilibili.com/414149787","group":"竞速 / 体育 / 模拟 / 音游","aliases":["Phigros官方"]},{"displayName":"舞力全开","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/585b0c49b9cca0eda8ab3090469e4e001543e0f0.jpg","keywords":["舞力全开"],"followings":[525916725],"link":"https://space.bilibili.com/525916725","group":"竞速 / 体育 / 模拟 / 音游"},{"displayName":"雀魂","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/cea293a3ecfe3b50154754eaa6525abc6d3fa6d5.jpg","keywords":["雀魂","雀魂麻将majsoul"],"followings":[353240497],"link":"https://space.bilibili.com/353240497","group":"竞速 / 体育 / 模拟 / 音游","aliases":["雀魂麻将majsoul"]},{"displayName":"光·遇","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/6a32a6914c6d4c95cd2bbe5bf1ac3c11aa5c763e.jpg","keywords":["光·遇","光遇手游"],"followings":[211700578],"link":"https://space.bilibili.com/211700578","group":"休闲 / 其他","aliases":["光遇手游"]},{"displayName":"人类一败涂地","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/e9dbe8028f8fd844448c4b81b16efa9172adb48f.jpg","keywords":["人类一败涂地","人类一败涂地官方"],"followings":[485646731],"link":"https://space.bilibili.com/485646731","group":"休闲 / 其他","aliases":["人类一败涂地官方"]},{"displayName":"球球大作战","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/21994111353cd624e74ca02482a0dbe3ed3a773f.jpg","keywords":["球球大作战"],"followings":[186701878],"link":"https://space.bilibili.com/186701878","group":"休闲 / 其他"},{"displayName":"地铁跑酷","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/df01f5c82b517704fac889004a42d474bbbabfe0.jpg","keywords":["地铁跑酷","地铁跑酷官方"],"followings":[239111749],"link":"https://space.bilibili.com/239111749","group":"休闲 / 其他","aliases":["地铁跑酷官方"]},{"displayName":"开心消消乐","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/7c419566cf02b5d32a62b80bd8a1675cc57639ed.jpg","keywords":["开心消消乐","开心消消乐官方手游"],"followings":[1097437029],"link":"https://space.bilibili.com/1097437029","group":"休闲 / 其他","aliases":["开心消消乐官方手游"]},{"displayName":"元气骑士","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/798056bd26da76e86c0a94af94f477ab982f1d0a.jpg","keywords":["元气骑士"],"followings":[87721937],"link":"https://space.bilibili.com/87721937","group":"休闲 / 其他"},{"displayName":"欢乐斗地主","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/03a6cac5084b6eb2c21d614ebd8b84da23829dfd.jpg","keywords":["欢乐斗地主"],"followings":[650941077],"link":"https://space.bilibili.com/650941077","group":"休闲 / 其他"},{"displayName":"火影忍者手游","category":"game","showIcon":true,"displayIcon":"https://i0.hdslb.com/bfs/face/3c975d44586143dd0eb4b121a3437bc8cc696610.jpg","keywords":["火影忍者手游","火影忍者手游情报君"],"followings":[441897078],"link":"https://space.bilibili.com/441897078","group":"IP 改编游戏","aliases":["火影忍者手游情报君"]},{"displayName":"火影忍者OL","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/d08bf242a8ad83cb41038c9c2033f830e879c42f.jpg","keywords":["火影忍者OL","火影忍者OL手游"],"followings":[355176119],"link":"https://space.bilibili.com/355176119","group":"IP 改编游戏","aliases":["火影忍者OL手游"]},{"displayName":"哈利波特：魔法觉醒","category":"game","showIcon":true,"displayIcon":"https://i2.hdslb.com/bfs/face/96129aa9b056bb81f4fe6db6be8bc9905939f16c.jpg","keywords":["哈利波特：魔法觉醒","哈利波特魔法觉醒"],"followings":[398877923],"link":"https://space.bilibili.com/398877923","group":"IP 改编游戏"},{"displayName":"航海王：热血航线","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/21e0d066df3b89c137f0065d2d9d57c03ef89ae2.jpg","keywords":["航海王：热血航线","航海王热血航线官方"],"followings":[669928891],"link":"https://space.bilibili.com/669928891","group":"IP 改编游戏","aliases":["航海王热血航线官方"]},{"displayName":"航海王：燃烧意志","category":"game","showIcon":true,"displayIcon":"https://i1.hdslb.com/bfs/face/f3e4d8024f7360a523da68934a833c6d04f02101.jpg","keywords":["航海王：燃烧意志","航海王燃烧意志"],"followings":[271078012],"link":"https://space.bilibili.com/271078012","group":"IP 改编游戏"},{"displayName":"老番茄","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/bc5ca101313d4db223c395d64779e76eb3482d60.jpg","keywords":[],"followings":[546195],"link":"https://space.bilibili.com/546195","group":"游戏主播"},{"displayName":"某幻君","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/a7eda2f97431d13f89a43b310262d1b19be83c01.jpg","keywords":[],"followings":[1577804],"link":"https://space.bilibili.com/1577804","group":"游戏主播"},{"displayName":"花少北","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/06c233a0136f738f8f54a08770dc7d484ae45081.jpg","keywords":[],"followings":[2206456],"link":"https://space.bilibili.com/2206456","group":"游戏主播","aliases":["花少北丶"]},{"displayName":"中国BOY超级大猩猩","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/ffb50dd4e712386eb888030ebc6f4aea3a65cd8e.jpg","keywords":[],"followings":[562197],"link":"https://space.bilibili.com/562197","group":"游戏主播"},{"displayName":"逍遥散人","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/8a5de2d7486251e80307d8600cbf8649eb4035fe.jpg","keywords":[],"followings":[168598],"link":"https://space.bilibili.com/168598","group":"游戏主播"},{"displayName":"王老菊","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/c707dbb7fba4c5184b587024c3ac681b3f5c7c12.jpg","keywords":[],"followings":[423895],"link":"https://space.bilibili.com/423895","group":"游戏主播","aliases":["怕上火暴王老菊"]},{"displayName":"黑桐谷歌","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/d0516b7382fd0199232cd60fab540fb3a2688e19.jpg","keywords":[],"followings":[43536],"link":"https://space.bilibili.com/43536","group":"游戏主播"},{"displayName":"纯黑","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/e8ab7b02d6576f4141ea857734b68b9dd35a5730.jpg","keywords":[],"followings":[585267],"link":"https://space.bilibili.com/585267","group":"游戏主播"},{"displayName":"渗透之C君","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/a12790be51aa6c9e3583fa94cb9b11cbfe0dacc2.jpg","keywords":[],"followings":[4162287],"link":"https://space.bilibili.com/4162287","group":"游戏主播"},{"displayName":"神奇陆夫人","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/ea80f09f64b66a0fa97646043a49f6c2f294d855.jpg","keywords":[],"followings":[419220],"link":"https://space.bilibili.com/419220","group":"游戏主播"},{"displayName":"嘟督不噶油","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/74738ef7c1ff743959908029b4c9d2dd8b5827c6.jpg","keywords":[],"followings":[2403047],"link":"https://space.bilibili.com/2403047","group":"游戏主播"},{"displayName":"口袋迷ag","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/0339f625390570205b46ef4ad07f16d172a19123.jpg","keywords":[],"followings":[343348],"link":"https://space.bilibili.com/343348","group":"游戏主播"},{"displayName":"女流","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/edf16837c41a45c098f3ee0c5f597eed2cbc9337.jpg","keywords":[],"followings":[2304046],"link":"https://space.bilibili.com/2304046","group":"游戏主播","aliases":["女流66"]},{"displayName":"陈子豪","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/38815ab3bcd6af002ad274d9f0c58bf60221fb7e.jpg","keywords":[],"followings":[1318997],"link":"https://space.bilibili.com/1318997","group":"游戏主播","aliases":["陈子豪丶EX"]},{"displayName":"大司马","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/fceeb53b76ee24371b221f07400e83f54e53a33e.jpg","keywords":[],"followings":[244144308],"link":"https://space.bilibili.com/244144308","group":"游戏主播","aliases":["大司马工作室"]},{"displayName":"PDD","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/522613f9adb227645452aaf89d7ec494bc900add.jpg","keywords":[],"followings":[36882906],"link":"https://space.bilibili.com/36882906","group":"游戏主播","aliases":["PDD在B站"]},{"displayName":"旭旭宝宝","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/5e68967523c6ea6b30d3959a563aac4ef132a6ce.jpg","keywords":[],"followings":[315551393],"link":"https://space.bilibili.com/315551393","group":"游戏主播"},{"displayName":"茄子","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/279eb22857144c91165646697745e442082dab45.jpg","keywords":[],"followings":[381435385],"link":"https://space.bilibili.com/381435385","group":"游戏主播","aliases":["CSGO大茄子"]},{"displayName":"周淑怡","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/93a7371c185067d166126322cf768702d7c049d9.jpg","keywords":[],"followings":[306895558],"link":"https://space.bilibili.com/306895558","group":"游戏主播","aliases":["不2不叫周淑怡"]},{"displayName":"一条小团团","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/5c63a200dbe0a4ceed5abb39d04b337b2f8bad10.jpg","keywords":[],"followings":[390079112],"link":"https://space.bilibili.com/390079112","group":"游戏主播","aliases":["一条小团团OvO"]},{"displayName":"呆妹儿小霸王","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/4508940e743e36e70fab3f8a19817ff11dcb54da.jpg","keywords":[],"followings":[247743458],"link":"https://space.bilibili.com/247743458","group":"游戏主播"},{"displayName":"药水哥","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/b70d7bb9b5455871d5e8c3dd4bbf194e6a5125d6.jpg","keywords":[],"followings":[305642157],"link":"https://space.bilibili.com/305642157","group":"游戏主播","aliases":["药水哥y"]},{"displayName":"电棍","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/ecf4c55dad9446deed5cf67e5906f71fbbd6c032.jpg","keywords":[],"followings":[628845081],"link":"https://space.bilibili.com/628845081","group":"游戏主播","aliases":["电棍otto"]},{"displayName":"孙笑川","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/946857bdbbe15c419e24a60cda6ae96b2ae348ca.jpg","keywords":[],"followings":[402574397],"link":"https://space.bilibili.com/402574397","group":"游戏主播","aliases":["孙笑川258"]},{"displayName":"洞主","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/f710686f7e775b9a8a94b521c506e58e9ee67a45.jpg","keywords":[],"followings":[393671271],"link":"https://space.bilibili.com/393671271","group":"游戏主播","aliases":["胡凯利_洞主"]},{"displayName":"东北大鹌鹑","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/5f63f315fbd054ecd0ecabeb6da43bd477f99fce.jpg","keywords":[],"followings":[2083524632],"link":"https://space.bilibili.com/2083524632","group":"游戏主播"},{"displayName":"余小C","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/273c16f3c51c1390f4989c05155ca2ef447cc224.jpg","keywords":[],"followings":[46016524],"link":"https://space.bilibili.com/46016524","group":"游戏主播","aliases":["余小C真的很美"]},{"displayName":"不求人","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/743bc12dd9133f097c8ad6fb8bdcdcc96523fcc2.jpg","keywords":[],"followings":[86216745],"link":"https://space.bilibili.com/86216745","group":"游戏主播","aliases":["不求人BQR"]},{"displayName":"难言","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/590588c2e34219cc55859ef2c4046588dd4544ce.jpg","keywords":[],"followings":[28440054],"link":"https://space.bilibili.com/28440054","group":"游戏主播","aliases":["难言言x"]},{"displayName":"鲨鱼哟","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/275318983cf6d04f5d044104b00d07edbf0f1c59.jpg","keywords":[],"followings":[302445540],"link":"https://space.bilibili.com/302445540","group":"游戏主播","aliases":["鲨鱼哟syy"]},{"displayName":"燃茶","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/6f4fe2e98d424dacb18ff47f5c61654c1f38ffeb.jpg","keywords":[],"followings":[129240403],"link":"https://space.bilibili.com/129240403","group":"游戏主播","aliases":["燃茶哥哥在此"]},{"displayName":"老撕鸡","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/72e1da20ee352ea4110c9fc203cd45b085e5b456.jpg","keywords":[],"followings":[46622315],"link":"https://space.bilibili.com/46622315","group":"游戏主播"},{"displayName":"UZI","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/25380ddbcc5609892121bef738b14a6931b1a4ac.jpg","keywords":[],"followings":[42619059],"link":"https://space.bilibili.com/42619059","group":"游戏主播"},{"displayName":"骚男","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/e219b2c0b22ba6e5322e3ae9b9f3d995a99adf95.jpg","keywords":[],"followings":[12761764],"link":"https://space.bilibili.com/12761764","group":"游戏主播","aliases":["骚男丶注意马叉虫"]},{"displayName":"梦泪","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/3247f2def5eee38652abeb6f88d6084c62350b1a.jpg","keywords":[],"followings":[108569350],"link":"https://space.bilibili.com/108569350","group":"游戏主播","aliases":["AG超玩会王者荣耀梦泪"]},{"displayName":"嗨氏","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/0cd85977e77391dbf3132ac889c91b5e92ad09df.jpg","keywords":[],"followings":[13934589],"link":"https://space.bilibili.com/13934589","group":"游戏主播","aliases":["嗨氏丶"]},{"displayName":"小潮院长","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/16420925b50153f99935c5415bddb2acecfea877.jpg","keywords":[],"followings":[5970160],"link":"https://space.bilibili.com/5970160","group":"游戏主播"},{"displayName":"大祥哥来了","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/3108a29f06ae4e31a66a0add22af22773b8828b8.jpg","keywords":[],"followings":[2920960],"link":"https://space.bilibili.com/2920960","group":"游戏主播"},{"displayName":"寅子","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/af7f56e72d3843ba457c6041fc5d638bccf50d5a.jpg","keywords":[],"followings":[669462270],"link":"https://space.bilibili.com/669462270","group":"游戏主播"},{"displayName":"Doinb","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/5dce505fcc6034e842be43f3442e5e7c9c5e69d6.jpg","keywords":[],"followings":[2069780561],"link":"https://space.bilibili.com/2069780561","group":"游戏主播","aliases":["Doinb金咕咕"]},{"displayName":"沫子","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/a2131d38a2ea73f16ff25e61dbeb40377233f552.jpg","keywords":[],"followings":[348989367],"link":"https://space.bilibili.com/348989367","group":"游戏主播","aliases":["沫子瞪片"]},{"displayName":"玩机器","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/9fab229975d8ae99a44172f03402aa9340e24552.jpg","keywords":[],"followings":[2183230],"link":"https://space.bilibili.com/2183230","group":"游戏主播","aliases":["CSGO玩机器"]},{"displayName":"皮克桃","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/421fa76f35cd4e953bde584f963ed29d95b89ad8.jpg","keywords":[],"followings":[388576506],"link":"https://space.bilibili.com/388576506","group":"游戏主播"},{"displayName":"嘉然今天吃什么","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/9ea3dfdcf336f9dee7f763d9f9b0a0b427bb0fa9.jpg","keywords":[],"followings":[672328094],"link":"https://space.bilibili.com/672328094","group":"虚拟主播"},{"displayName":"贝拉kira","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/3ccbfd77f000cf3154762b78694724cd9e6719e5.jpg","keywords":[],"followings":[672353429],"link":"https://space.bilibili.com/672353429","group":"虚拟主播"},{"displayName":"向晚大魔王","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/599aa32d217cdf6c8ce113b37aca5b19b9f07b3e.jpg","keywords":[],"followings":[672346917],"link":"https://space.bilibili.com/672346917","group":"虚拟主播"},{"displayName":"乃琳Queen","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/d7dac0d2c7a42b1ef9b018c2186092f5cd650a97.jpg","keywords":[],"followings":[672342685],"link":"https://space.bilibili.com/672342685","group":"虚拟主播"},{"displayName":"珈乐Carol","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/a7fea00016a8d3ffb015b6ed8647cc3ed89cbc63.jpg","keywords":[],"followings":[351609538],"link":"https://space.bilibili.com/351609538","group":"虚拟主播"},{"displayName":"永雏塔菲","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/67b10272c5451766b6097d1be8af0a2d93e5a122.jpg","keywords":[],"followings":[1265680561],"link":"https://space.bilibili.com/1265680561","group":"虚拟主播"},{"displayName":"東雪蓮","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/55db91bff8585a806a0e5d3e7394b129afcafa50.jpg","keywords":[],"followings":[1437582453],"link":"https://space.bilibili.com/1437582453","group":"虚拟主播","aliases":["東雪蓮Official"]},{"displayName":"七海Nana7mi","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/971ef0f04571f866bcd2384248ded054649b7790.jpg","keywords":[],"followings":[434334701],"link":"https://space.bilibili.com/434334701","group":"虚拟主播"},{"displayName":"泠鸢yousa","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/garb/22d62658a1810625bd569cf84a33f5555fe06984.png","keywords":[],"followings":[282994],"link":"https://space.bilibili.com/282994","group":"虚拟主播"},{"displayName":"洛天依","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/garb/d9bfee24c093e6a2f4d14cd84b1746c538c7c6ce.png","keywords":[],"followings":[36081646],"link":"https://space.bilibili.com/36081646","group":"虚拟主播"},{"displayName":"阿梓从小就很可爱","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/bd4253b0eb80684a86efa0097935004527bcc773.jpg","keywords":[],"followings":[7706705],"link":"https://space.bilibili.com/7706705","group":"虚拟主播"},{"displayName":"猫雷NyaRu","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/90b5aa9f5fb4fe648a3a9d8cb552c561e6e141b4.jpg","keywords":[],"followings":[697091119],"link":"https://space.bilibili.com/697091119","group":"虚拟主播","aliases":["猫雷NyaRu_Official"]},{"displayName":"咩栗","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/5c26e72882e93fca4051a4ef4449f28f943d4cb8.jpg","keywords":[],"followings":[745493],"link":"https://space.bilibili.com/745493","group":"虚拟主播"},{"displayName":"呜米","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/28984d7f3693f068c0ccdb7ce61702dc0bae8866.jpg","keywords":[],"followings":[617459493],"link":"https://space.bilibili.com/617459493","group":"虚拟主播"},{"displayName":"冰糖IO","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/b4e9c733f9053493f0672d2375c215df26c39c97.jpg","keywords":[],"followings":[198297],"link":"https://space.bilibili.com/198297","group":"虚拟主播"},{"displayName":"多多poi","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/e5c5a963ff3c3c50e8b358a2aacdc848f7668857.jpg","keywords":[],"followings":[11253297],"link":"https://space.bilibili.com/11253297","group":"虚拟主播","aliases":["多多poi丶"]},{"displayName":"绯赤艾莉欧","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/5cb0841c3c2e4ddc88a58a7a232e68460fcd5c79.jpg","keywords":[],"followings":[407106379],"link":"https://space.bilibili.com/407106379","group":"虚拟主播","aliases":["绯赤艾莉欧_NHOTBOT"]},{"displayName":"星街彗星","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/63585f1563aff2f22be97ddbd01105e31ff9ec8a.jpg","keywords":[],"followings":[9034870],"link":"https://space.bilibili.com/9034870","group":"虚拟主播","aliases":["星街彗星Official"]},{"displayName":"白神遥","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/b46bc75db042a6e40f5dc90aece766df2bef364c.jpg","keywords":[],"followings":[477332594],"link":"https://space.bilibili.com/477332594","group":"虚拟主播","aliases":["白神遥Haruka"]},{"displayName":"时乃空","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/dbe787cb37a78587aa6f282cdafdc37a73348495.jpg","keywords":[],"followings":[286179206],"link":"https://space.bilibili.com/286179206","group":"虚拟主播","aliases":["时乃空Official"]},{"displayName":"白上吹雪","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/7aff7cd75b5c60cb50a224cf1313a69700be8558.jpg","keywords":[],"followings":[332704117],"link":"https://space.bilibili.com/332704117","group":"虚拟主播","aliases":["白上吹雪Official"]},{"displayName":"兔田佩克拉","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/628971469a1be92840c59d3cb664e29b6348eeb4.jpg","keywords":[],"followings":[443305053],"link":"https://space.bilibili.com/443305053","group":"虚拟主播","aliases":["兔田佩克拉Official"]},{"displayName":"宝钟玛琳","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/fdb3db0f4adfbe9df2e4a24961a354303bd30ecc.jpg","keywords":[],"followings":[454955503],"link":"https://space.bilibili.com/454955503","group":"虚拟主播","aliases":["宝钟玛琳Official"]},{"displayName":"天音彼方","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/650cfc772c3141d0f92e984844c9998af82b9047.jpg","keywords":[],"followings":[491474048],"link":"https://space.bilibili.com/491474048","group":"虚拟主播","aliases":["天音彼方Official"]},{"displayName":"星瞳","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/garb/a5a22989a3c14027c478ac95c2062e3241cec892.png","keywords":[],"followings":[401315430],"link":"https://space.bilibili.com/401315430","group":"虚拟主播","aliases":["星瞳_Official"]},{"displayName":"阿萨Aza","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/75ed00a7111cb3e33822cb1cc311c00980563d4b.jpg","keywords":[],"followings":[480680646],"link":"https://space.bilibili.com/480680646","group":"虚拟主播"},{"displayName":"鹿乃","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/64e04cadb47e602c0b85f4bdaef221f398ca86d1.jpg","keywords":[],"followings":[316381099],"link":"https://space.bilibili.com/316381099","group":"虚拟主播","aliases":["鹿乃ちゃん"]},{"displayName":"咬人猫","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/8fad84a4470f3d894d8f0dc95555ab8f2cb10a83.jpg","keywords":[],"followings":[116683],"link":"https://space.bilibili.com/116683","group":"娱乐 / 生活区 UP 主","aliases":["=咬人猫="]},{"displayName":"欣小萌","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/60368b5e2850cc569328e8b562d90cb28ce5b2cd.jpg","keywords":[],"followings":[8366990],"link":"https://space.bilibili.com/8366990","group":"娱乐 / 生活区 UP 主"},{"displayName":"啊吗粽","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/3d558e5680c0fb69c022659339570808cea4764e.jpg","keywords":[],"followings":[7552204],"link":"https://space.bilibili.com/7552204","group":"娱乐 / 生活区 UP 主"},{"displayName":"力元君","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/a163d177a378ac99d070c569bef34fe18c08b057.jpg","keywords":[],"followings":[19642758],"link":"https://space.bilibili.com/19642758","group":"娱乐 / 生活区 UP 主"},{"displayName":"徐大sao","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/17323892be2e17b50acadb89b2e385b493f5fb4d.jpg","keywords":[],"followings":[390461123],"link":"https://space.bilibili.com/390461123","group":"娱乐 / 生活区 UP 主"},{"displayName":"华农兄弟","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/bac504655c69ab937b0be4557e27535f794b0c66.jpg","keywords":[],"followings":[250858633],"link":"https://space.bilibili.com/250858633","group":"娱乐 / 生活区 UP 主"},{"displayName":"李子柒","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/82d27965dae3b2fe9e52780c6309c7b37ad4cbf2.jpg","keywords":[],"followings":[19577966],"link":"https://space.bilibili.com/19577966","group":"娱乐 / 生活区 UP 主"},{"displayName":"绵羊料理","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/54b5c9c2ad7f1baff195090bfd6afa365ef20c37.jpg","keywords":[],"followings":[18202105],"link":"https://space.bilibili.com/18202105","group":"娱乐 / 生活区 UP 主"},{"displayName":"王刚","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/1463fa4ea6bffd867dc257dca87248bb1d671cde.jpg","keywords":[],"followings":[290526283],"link":"https://space.bilibili.com/290526283","group":"娱乐 / 生活区 UP 主","aliases":["美食作家王刚R"]},{"displayName":"手工耿","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/b8a75ae7d2a0e2af1d36ca9f1084d850eebb28e3.jpg","keywords":[],"followings":[280793434],"link":"https://space.bilibili.com/280793434","group":"娱乐 / 生活区 UP 主"},{"displayName":"何同学","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/492d0bb71749332040f9d812954fa0b52e66c490.jpg","keywords":[],"followings":[163637592],"link":"https://space.bilibili.com/163637592","group":"娱乐 / 生活区 UP 主","aliases":["老师好我叫何同学"]},{"displayName":"影视飓风","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/c1733474892caa45952b2c09a89323157df7129a.jpg","keywords":[],"followings":[946974],"link":"https://space.bilibili.com/946974","group":"娱乐 / 生活区 UP 主"},{"displayName":"罗翔说刑法","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/4e5d0a51273fe3f8fabc700b6a71bb8a38c9e21e.jpg","keywords":[],"followings":[517327498],"link":"https://space.bilibili.com/517327498","group":"娱乐 / 生活区 UP 主"},{"displayName":"无穷小亮","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/6de12181ed59518fc7beff2046fb3218d50206cc.jpg","keywords":[],"followings":[14804670],"link":"https://space.bilibili.com/14804670","group":"娱乐 / 生活区 UP 主","aliases":["无穷小亮的科普日常"]},{"displayName":"冯提莫","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/465727fd137b02759d22094cc38ff6467e6ead10.jpg","keywords":[],"followings":[436473455],"link":"https://space.bilibili.com/436473455","group":"娱乐 / 生活区 UP 主"},{"displayName":"纳豆nado","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/ea1084360d6823a2ba44a3752c251b9dddcf557f.jpg","keywords":[],"followings":[620666],"link":"https://space.bilibili.com/620666","group":"娱乐 / 生活区 UP 主"},{"displayName":"管泽元","category":"streamer","showIcon":false,"displayIcon":"https://i1.hdslb.com/bfs/face/54aee7a8de935c84e9ff3eb596f45d99d6a44f1f.jpg","keywords":[],"followings":[271338616],"link":"https://space.bilibili.com/271338616","group":"解说 / 电竞"},{"displayName":"余霜","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/baf782bb9d1d26f980be7fb5300985e263004c38.jpg","keywords":[],"followings":[325737642],"link":"https://space.bilibili.com/325737642","group":"解说 / 电竞","aliases":["余霜Candice"]},{"displayName":"骆歆","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/059d712c25e6d2571c736e0470b7e43222fa7cb3.jpg","keywords":[],"followings":[33416285],"link":"https://space.bilibili.com/33416285","group":"解说 / 电竞","aliases":["骆歆同学"]},{"displayName":"小钰","category":"streamer","showIcon":false,"displayIcon":"https://i0.hdslb.com/bfs/face/117aa0fa778ff59f47f3dc436d8c616453b058e7.jpg","keywords":[],"followings":[172294146],"link":"https://space.bilibili.com/172294146","group":"解说 / 电竞","aliases":["小钰Hilda"]},{"displayName":"Rita","category":"streamer","showIcon":false,"displayIcon":"https://i2.hdslb.com/bfs/face/5e8a3c08376f27677963d0f2812be4bd899fb5d0.jpg","keywords":[],"followings":[291136763],"link":"https://space.bilibili.com/291136763","group":"解说 / 电竞","aliases":["Rita小雨酱"]}]};
    /* __EMBEDDED_RULES_END__ */

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

    const embeddedLibrary = sanitizeRulesObject(EMBEDDED_RULES) || { version: '内置', updatedAt: '', checkers: [] };
    const cachedLibrary = loadCachedRules();
    let libraryRules = cachedLibrary ? cachedLibrary.rules : embeddedLibrary;
    let rulesMeta = {
        source: cachedLibrary ? '缓存' : '内置',
        version: libraryRules.version || 'unknown',
        updatedAt: libraryRules.updatedAt || '',
        fetchedAt: cachedLibrary ? cachedLibrary.fetchedAt : 0,
        count: libraryRules.checkers.length,
        verified: !!cachedLibrary
    };
    let options = loadOptions();
    let userCheckers = loadUserCheckers();
    let checkers = mergeCheckers(libraryRules.checkers, userCheckers);
    let manualTags = loadManualTags();
    let rulesStatusEl = null;
    let rulesRefreshing = false;
    let rulesLastError = '';
    let rulesKeyPromise = null;
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

    function sanitizeChecker(item) {
        if (!item || typeof item !== 'object') return null;
        const displayName = String(item.displayName || '').trim().slice(0, 50);
        if (!displayName) return null;
        const keywords = Array.isArray(item.keywords)
            ? item.keywords.map(function (value) { return String(value || '').trim().slice(0, 50); })
                .filter(Boolean).slice(0, 30)
            : [];
        const followings = Array.isArray(item.followings)
            ? item.followings.map(Number).filter(function (n) { return Number.isFinite(n); }).slice(0, 20)
            : [];
        const aliases = Array.isArray(item.aliases)
            ? item.aliases.map(function (value) { return String(value || '').trim().slice(0, 50); })
                .filter(Boolean).slice(0, 10)
            : [];
        let displayIcon = typeof item.displayIcon === 'string' ? item.displayIcon.trim() : '';
        if (/^http:\/\//i.test(displayIcon)) displayIcon = 'https://' + displayIcon.slice(7);
        if (!/^https:\/\//i.test(displayIcon)) displayIcon = '';
        let link = typeof item.link === 'string' ? item.link.trim() : '';
        if (/^http:\/\//i.test(link)) link = 'https://' + link.slice(7);
        if (!/^https:\/\//i.test(link)) link = '';
        const category = ['game', 'streamer', 'other'].indexOf(item.category) !== -1 ? item.category : 'other';
        const showIcon = typeof item.showIcon === 'boolean' ? item.showIcon : category !== 'streamer';
        return {
            displayName: displayName,
            category: category,
            showIcon: showIcon,
            displayIcon: displayIcon,
            keywords: keywords,
            followings: followings,
            link: link,
            aliases: aliases,
            group: typeof item.group === 'string' ? item.group.trim().slice(0, 50) : ''
        };
    }

    function sanitizeCheckers(list) {
        if (!Array.isArray(list)) return [];
        const out = [];
        const seen = new Set();
        for (const item of list.slice(0, 500)) {
            const checker = sanitizeChecker(item);
            if (!checker || seen.has(checker.displayName)) continue;
            seen.add(checker.displayName);
            out.push(checker);
        }
        return out;
    }

    function sanitizeRulesObject(data) {
        if (!data || typeof data !== 'object') return null;
        const list = sanitizeCheckers(data.checkers);
        if (!list.length) return null;
        return {
            schema: Number(data.schema) || 1,
            version: String(data.version || '').slice(0, 30) || 'unknown',
            updatedAt: String(data.updatedAt || '').slice(0, 30),
            checkers: list
        };
    }

    function loadUserCheckers() {
        let list = [];
        try { list = sanitizeCheckers(GM_getValue(STORE_KEY)); } catch (e) {}
        if (!list.length) {
            try { list = sanitizeCheckers(GM_getValue(LEGACY_KEY)); } catch (e) {}
        }
        return list;
    }

    function saveCheckers() {
        try { GM_setValue(STORE_KEY, checkers); } catch (e) {}
        userCheckers = checkers.slice();
        userCache.clear();
    }

    function mergeCheckers(library, user) {
        const map = new Map();
        for (const item of library) map.set(item.displayName, item);
        for (const item of user) {
            const base = map.get(item.displayName);
            if (!base) {
                map.set(item.displayName, item);
                continue;
            }
            map.set(item.displayName, {
                displayName: item.displayName,
                category: item.category !== 'other' ? item.category : base.category,
                showIcon: item.category === 'streamer' ? false
                    : (typeof item.showIcon === 'boolean' ? item.showIcon : base.showIcon),
                displayIcon: item.displayIcon || base.displayIcon,
                keywords: item.keywords.length ? item.keywords : base.keywords,
                followings: item.followings.length ? item.followings : base.followings,
                link: item.link || base.link,
                aliases: item.aliases.length ? item.aliases : base.aliases,
                group: item.group || base.group
            });
        }
        return Array.from(map.values());
    }

    function loadOptions() {
        const defaults = {
            useFollowings: true,
            useMedals: true,
            useRemoteRules: true,
            rulesUrl: DEFAULT_RULES_URL,
            mirrorPrefix: DEFAULT_MIRROR,
            minScore: DEFAULT_MIN_SCORE
        };
        let saved = null;
        try { saved = GM_getValue('options_v3'); } catch (e) {}
        if (!saved) {
            try { saved = GM_getValue('options_v2'); } catch (e) {}
        }
        if (saved && typeof saved === 'object') {
            return {
                useFollowings: saved.useFollowings !== false,
                useMedals: saved.useMedals !== false,
                useRemoteRules: saved.useRemoteRules !== false,
                rulesUrl: typeof saved.rulesUrl === 'string' && saved.rulesUrl.trim()
                    ? saved.rulesUrl.trim() : DEFAULT_RULES_URL,
                mirrorPrefix: typeof saved.mirrorPrefix === 'string'
                    ? saved.mirrorPrefix.trim() : DEFAULT_MIRROR,
                minScore: Number.isFinite(Number(saved.minScore))
                    ? Math.min(5, Math.max(1, Math.round(Number(saved.minScore))))
                    : DEFAULT_MIN_SCORE
            };
        }
        return defaults;
    }

    function saveOptions() {
        try { GM_setValue('options_v3', options); } catch (e) {}
        userCache.clear();
    }

    function loadCachedRules() {
        try {
            const cached = GM_getValue(RULES_CACHE_KEY);
            if (!cached || !cached.fetchedAt || !cached.rules) return null;
            if (cached.verified !== true) return null;
            const rules = sanitizeRulesObject(cached.rules);
            if (!rules) return null;
            return { rules: rules, fetchedAt: Number(cached.fetchedAt) || 0, source: cached.source || '缓存' };
        } catch (e) {
            return null;
        }
    }

    function rulesStatusText() {
        return '规则库 ' + (rulesMeta.version || '?') + ' · ' + (rulesMeta.count || checkers.length)
            + ' 条 · 来源：' + rulesMeta.source
            + (rulesMeta.verified ? ' · 签名已验证' : '')
            + (rulesLastError ? '（上次刷新：' + rulesLastError + '）' : '');
    }

    function updateRulesStatus() {
        if (rulesStatusEl && rulesStatusEl.isConnected) rulesStatusEl.textContent = rulesStatusText();
    }

    function buildRuleUrls() {
        if (!options.useRemoteRules || !/^https?:\/\//i.test(options.rulesUrl || '')) return [];
        const direct = options.rulesUrl;
        const urls = [];
        if (options.mirrorPrefix) {
            const prefix = options.mirrorPrefix.endsWith('/')
                ? options.mirrorPrefix : options.mirrorPrefix + '/';
            urls.push(prefix + direct);
        }
        urls.push(direct);
        return Array.from(new Set(urls));
    }

    function fetchRulesText(url) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                timeout: 15000,
                headers: { 'Accept': 'application/json' },
                onload: function (res) {
                    if (res.status !== 200) {
                        reject(new Error('HTTP ' + res.status));
                        return;
                    }
                    const text = res.responseText || '';
                    if (text.length > 2 * 1024 * 1024) {
                        reject(new Error('规则文件过大'));
                        return;
                    }
                    resolve(text);
                },
                onerror: function () { reject(new Error('网络错误')); },
                ontimeout: function () { reject(new Error('请求超时')); }
            });
        });
    }

    function signatureUrl(url) {
        const hashIndex = url.indexOf('#');
        const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
        const queryIndex = base.indexOf('?');
        if (queryIndex === -1) return base + '.sig';
        return base.slice(0, queryIndex) + '.sig' + base.slice(queryIndex);
    }

    function base64ToBytes(value) {
        const binary = atob(String(value || '').replace(/\s+/g, ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    function getRulesPublicKey() {
        if (!rulesKeyPromise) {
            rulesKeyPromise = crypto.subtle.importKey(
                'spki',
                base64ToBytes(RULES_PUBLIC_KEY_SPKI),
                { name: 'ECDSA', namedCurve: 'P-256' },
                false,
                ['verify']
            );
        }
        return rulesKeyPromise;
    }

    function verifyRulesSignature(text, signature) {
        if (!RULES_PUBLIC_KEY_SPKI || !signature || !signature.trim()) {
            return Promise.resolve(false);
        }
        if (typeof crypto === 'undefined' || !crypto.subtle || typeof TextEncoder === 'undefined') {
            return Promise.resolve(false);
        }
        return getRulesPublicKey().then(function (key) {
            return crypto.subtle.verify(
                { name: 'ECDSA', hash: { name: 'SHA-256' } },
                key,
                base64ToBytes(signature.trim()),
                new TextEncoder().encode(text)
            );
        });
    }

    function fetchVerifiedRules(url) {
        return Promise.all([fetchRulesText(url), fetchRulesText(signatureUrl(url))])
            .then(function (parts) {
                return verifyRulesSignature(parts[0], parts[1]).then(function (ok) {
                    if (!ok) throw new Error('规则签名校验失败');
                    try {
                        return JSON.parse(parts[0]);
                    } catch (e) {
                        throw new Error('规则文件不是 JSON');
                    }
                });
            });
    }

    function applyLibrary(rules, source, fetchedAt, verified) {
        const normalized = sanitizeRulesObject(rules);
        if (!normalized) return false;
        libraryRules = normalized;
        rulesMeta = {
            source: source,
            version: normalized.version,
            updatedAt: normalized.updatedAt,
            fetchedAt: fetchedAt || 0,
            count: normalized.checkers.length,
            verified: !!verified
        };
        checkers = mergeCheckers(libraryRules.checkers, userCheckers);
        userCache.clear();
        updateRulesStatus();
        return true;
    }

    function refreshRules(force) {
        if (!options.useRemoteRules || rulesRefreshing) return Promise.resolve(false);
        const cached = loadCachedRules();
        if (!force && cached && Date.now() - cached.fetchedAt < RULES_MAX_AGE) {
            return Promise.resolve(false);
        }
        let lastAttempt = 0;
        try { lastAttempt = Number(GM_getValue('rules_last_attempt')) || 0; } catch (e) {}
        if (!force && Date.now() - lastAttempt < RULES_RETRY_AGE) {
            return Promise.resolve(false);
        }
        try { GM_setValue('rules_last_attempt', Date.now()); } catch (e) {}
        rulesRefreshing = true;
        const urls = buildRuleUrls();
        let lastError = new Error('没有可用的规则源');
        const attempt = function (index) {
            if (index >= urls.length) {
                rulesRefreshing = false;
                rulesLastError = lastError && lastError.message ? lastError.message : '刷新失败';
                dlog('规则库刷新失败', rulesLastError);
                updateRulesStatus();
                return Promise.resolve(false);
            }
            return fetchVerifiedRules(urls[index]).then(function (data) {
                const normalized = sanitizeRulesObject(data);
                if (!normalized) throw new Error('规则格式无效');
                try {
                    GM_setValue(RULES_CACHE_KEY, {
                        fetchedAt: Date.now(),
                        source: urls[index],
                        verified: true,
                        rules: normalized
                    });
                } catch (e) {}
                rulesLastError = '';
                applyLibrary(normalized, '远程', Date.now(), true);
                dlog('规则库已更新', normalized.version, normalized.checkers.length, urls[index]);
                rulesRefreshing = false;
                return true;
            }).catch(function (error) {
                lastError = error || lastError;
                dlog('规则源失败', urls[index], error && error.message);
                return attempt(index + 1);
            });
        };
        return attempt(0);
    }

    function sanitizeManualTag(item) {
        if (!item || !/^\d+$/.test(String(item.uid || ''))) return null;
        const uid = String(item.uid);
        const name = String(item.name || '').trim().slice(0, 50);
        if (!name) return null;
        let icon = typeof item.icon === 'string' ? item.icon.trim() : '';
        if (/^http:\/\//i.test(icon)) icon = 'https://' + icon.slice(7);
        if (!/^https:\/\//i.test(icon)) icon = '';
        const iconSource = typeof item.iconSource === 'string' ? item.iconSource.trim().slice(0, 50) : '';
        return { uid: uid, name: name, icon: icon, iconSource: iconSource };
    }

    function loadManualTags() {
        try {
            const saved = GM_getValue(MANUAL_KEY);
            if (Array.isArray(saved)) {
                return saved.map(sanitizeManualTag).filter(Boolean);
            }
        } catch (e) {}
        try {
            const legacy = GM_getValue(MANUAL_LEGACY_KEY);
            if (Array.isArray(legacy)) {
                return legacy.map(sanitizeManualTag).filter(Boolean);
            }
        } catch (e) {}
        return [];
    }

    function saveManualTags() {
        try { GM_setValue(MANUAL_KEY, manualTags); } catch (e) {}
        userCache.clear();
    }

    function manualTagsFor(uid) {
        const id = String(uid);
        return manualTags.filter(function (item) { return item.uid === id; });
    }

    function addManualTag(uid, name, icon, iconSource) {
        const id = String(uid || '');
        const text = String(name || '').trim();
        if (!/^\d+$/.test(id) || !text) return false;
        for (const item of manualTags) {
            if (item.uid === id && item.name === text) return false;
        }
        const tag = sanitizeManualTag({ uid: id, name: text, icon: icon, iconSource: iconSource });
        if (!tag) return false;
        manualTags.push(tag);
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

    function isOwnUI(node) {
        return !!(node && node.closest && node.closest(
            '.bili-composition-tag, .bili-composition-tags, .bili-composition-badge, '
            + '.bili-composition-manual-add, #bili-composition-panel, '
            + '#bili-composition-uploader, #bili-composition-settings'
        ));
    }

    function findCandidates(root) {
        const out = [];
        let anchors = [];
        try { anchors = root.querySelectorAll('a[href*="space.bilibili.com/"]'); } catch (e) { anchors = []; }
        for (const anchor of anchors) {
            if (isOwnUI(anchor) || !inComment(anchor)) continue;
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
            if (node.tagName === 'A' || isOwnUI(node)) continue;
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

    function collectDynamicParts(item, parts) {
        if (!item || typeof item !== 'object') return;
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

    function extractDynamicText(settled) {
        if (!settled || settled.status !== 'fulfilled') return { own: '', forward: '' };
        const data = settled.value;
        if (!data || data.code !== 0 || !data.data) return { own: '', forward: '' };
        const items = data.data.items || data.data.cards || [];
        const own = [];
        const forward = [];
        for (const item of items) {
            if (!item || typeof item !== 'object') continue;
            collectDynamicParts(item, own);
            if (item.orig) collectDynamicParts(item.orig, forward);
        }
        return { own: own.join('\n'), forward: forward.join('\n') };
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
        if (!settled || settled.status !== 'fulfilled') return { ids: [], names: [] };
        const data = settled.value;
        if (!data || data.code !== 0 || !data.data || !Array.isArray(data.data.list)) {
            return { ids: [], names: [] };
        }
        const ids = [];
        const names = [];
        for (const item of data.data.list) {
            const info = item && item.medal_info;
            if (!info) continue;
            const id = Number(info.target_id);
            if (Number.isFinite(id)) ids.push(id);
            const name = String(info.medal_name || '').trim();
            if (name) names.push(name);
        }
        return { ids: ids, names: names };
    }

    function extractDecorations(settled) {
        if (!settled || settled.status !== 'fulfilled') return '';
        const data = settled.value;
        if (!data || data.code !== 0 || !data.data) return '';
        const card = data.data.card || {};
        const parts = [];
        if (card.pendant && card.pendant.name) parts.push(String(card.pendant.name));
        if (card.nameplate && card.nameplate.name) parts.push(String(card.nameplate.name));
        return parts.join(' ');
    }

    function normText(value) {
        return String(value || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
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

        const cardUrl = 'https://api.bilibili.com/x/web-interface/card?mid=' + encodeURIComponent(uid);

        return Promise.allSettled([gmGet(dynUrl), gmGet(folUrl), gmGet(medUrl), gmGet(cardUrl)])
            .then(function (settled) {
                const dynData = settled[0].status === 'fulfilled' ? settled[0].value : null;
                const folData = settled[1].status === 'fulfilled' ? settled[1].value : null;
                const medData = settled[2].status === 'fulfilled' ? settled[2].value : null;
                const cardData = settled[3].status === 'fulfilled' ? settled[3].value : null;
                const dynText = extractDynamicText(settled[0]);
                const following = extractFollowing(settled[1]);
                const medalData = extractMedals(settled[2]);
                const medalIds = medalData.ids;
                const medalHay = normText(medalData.names.join(' '));
                const decorationHay = normText(extractDecorations(settled[3]));
                const notes = [];
                if (!dynData || dynData.code !== 0) notes.push('动态接口不可用' + apiHint(dynData));
                if (!folData || folData.code !== 0) notes.push('关注列表不可用' + apiHint(folData));
                if (!medData || medData.code !== 0) notes.push('粉丝牌不可用' + apiHint(medData));
                if (!cardData || cardData.code !== 0) notes.push('个性装扮不可用' + apiHint(cardData));

                if (debug) {
                    console.debug('[成分指示器] 接口结果', {
                        uid: uid,
                        dynamic: dynData && dynData.code,
                        following: folData && folData.code,
                        medal: medData && medData.code,
                        decoration: cardData && cardData.code,
                        elapsed: Date.now() - started
                    });
                }

                const minScore = options.minScore || DEFAULT_MIN_SCORE;
                const found = [];
                const seenNames = new Set();
                for (const item of manualTagsFor(uid)) {
                    if (seenNames.has(item.name)) continue;
                    seenNames.add(item.name);
                    found.push({
                        checker: { displayName: item.name, displayIcon: '' },
                        reason: { source: 'manual', detail: '' },
                        icon: item.icon,
                        iconSource: item.iconSource
                    });
                }
                for (const checker of checkers) {
                    if (seenNames.has(checker.displayName)) continue;
                    const reasons = [];
                    let score = 0;

                    if (checker.keywords.length) {
                        if (dynText.own) {
                            const word = checker.keywords.find(function (item) {
                                return dynText.own.indexOf(item) !== -1;
                            });
                            if (word) {
                                reasons.push('动态');
                                score += SOURCE_WEIGHTS.dynamic;
                            }
                        }
                        if (dynText.forward) {
                            const word = checker.keywords.find(function (item) {
                                return dynText.forward.indexOf(item) !== -1;
                            });
                            if (word) {
                                reasons.push('转发原文');
                                score += SOURCE_WEIGHTS.forward;
                            }
                        }
                    }

                    let medalHit = false;
                    if (options.useMedals && medalHay) {
                        const candidates = [checker.displayName]
                            .concat(checker.aliases || [], checker.keywords || []);
                        medalHit = candidates.some(function (name) {
                            const value = normText(name);
                            return value.length >= 2 && medalHay.indexOf(value) !== -1;
                        });
                    }
                    if (!medalHit && options.useMedals && checker.followings.length && medalIds.length) {
                        medalHit = checker.followings.some(function (id) {
                            return medalIds.indexOf(id) !== -1;
                        });
                    }
                    if (medalHit) {
                        reasons.push('粉丝牌');
                        score += SOURCE_WEIGHTS.medal;
                    }

                    if (decorationHay) {
                        const candidates = [checker.displayName]
                            .concat(checker.aliases || [], checker.keywords || []);
                        const decorationHit = candidates.some(function (name) {
                            const value = normText(name);
                            return value.length >= 2 && decorationHay.indexOf(value) !== -1;
                        });
                        if (decorationHit) {
                            reasons.push('个性装扮');
                            score += SOURCE_WEIGHTS.decoration;
                        }
                    }

                    if (options.useFollowings && checker.followings.length && following.length) {
                        const followingHit = checker.followings.some(function (id) {
                            return following.indexOf(id) !== -1;
                        });
                        if (followingHit) {
                            reasons.push('关注');
                            score += SOURCE_WEIGHTS.following;
                        }
                    }

                    if (reasons.length && score >= minScore) {
                        found.push({ checker: checker, reasons: reasons, score: score });
                        seenNames.add(checker.displayName);
                    }
                }
                if (debug && found.length) {
                    console.debug('[成分指示器] 命中', uid, found.map(function (item) {
                        return item.checker.displayName
                            + ' @ ' + (item.reasons || []).join('+')
                            + ' (' + (item.score || 0) + ')';
                    }));
                }

                const usable = [dynData, folData, medData, cardData].some(function (data) {
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
        wrapper.style.position = 'relative';
        wrapper.style.zIndex = '10';

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
                    wrapper.appendChild(makeManualTag(item.checker.displayName, target.uid, item.icon, item.iconSource));
                } else {
                    wrapper.appendChild(makeTag(item.checker, item.reasons, item.score));
                }
            }
        }
        wrapper.appendChild(makeManualAdd(target.uid, wrapper));
        applyTagCollapse(wrapper);
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

    function attachTagIcon(tag, url) {
        if (!/^https:\/\//i.test(url || '')) return;
        const icon = document.createElement('img');
        icon.alt = '';
        icon.loading = 'lazy';
        icon.style.cssText = 'width:14px;height:14px;border-radius:50%;display:block;';
        icon.addEventListener('error', function () { icon.remove(); });
        icon.src = url;
        tag.appendChild(icon);
    }

    function installTagClickGuard() {
        if (window.__BSPC_TAG_GUARD__) return;
        window.__BSPC_TAG_GUARD__ = true;
        function findMore(event) {
            const path = event.composedPath ? event.composedPath() : [];
            for (const node of path) {
                if (node && node.classList && node.classList.contains('bili-composition-more')) return node;
            }
            return null;
        }
        ['pointerdown', 'mousedown', 'pointerup'].forEach(function (type) {
            window.addEventListener(type, function (event) {
                if (findMore(event)) event.stopImmediatePropagation();
            }, true);
        });
        window.addEventListener('click', function (event) {
            const more = findMore(event);
            if (!more) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (more.parentElement) openMorePanel(more.parentElement);
        }, true);
    }

    function openMorePanel(wrapper) {
        let panel = document.getElementById('bili-composition-more-panel');
        let body = null;
        if (!panel) {
            const built = createFloatingPanel(
                'bili-composition-more-panel',
                '成分标签',
                'bspc_more_pos',
                null,
                { left: Math.max(16, window.innerWidth - 320), bottom: 16 }
            );
            panel = built.panel;
            body = built.body;
            body.dataset.role = 'more-body';
            body.style.display = 'flex';
            body.style.flexWrap = 'wrap';
            body.style.gap = '6px';
            body.style.alignContent = 'flex-start';
            body.style.maxHeight = '50vh';
            body.style.overflowY = 'auto';
            document.body.appendChild(panel);
        } else {
            body = panel.querySelector('[data-role="more-body"]');
        }
        if (!body) return;
        body.textContent = '';
        const tags = [];
        for (const child of wrapper.children) {
            if (child.classList && child.classList.contains('bili-composition-tag')) tags.push(child);
        }
        if (!tags.length) {
            body.appendChild(document.createTextNode('无'));
            return;
        }
        for (const tag of tags) {
            const clone = tag.cloneNode(true);
            clone.style.display = 'inline-flex';
            clone.style.margin = '2px 0';
            body.appendChild(clone);
        }
    }

    function applyTagCollapse(wrapper) {
        if (!wrapper) return;
        const tags = [];
        let more = null;
        for (const child of wrapper.children) {
            if (!child.classList) continue;
            if (child.classList.contains('bili-composition-tag')) tags.push(child);
            if (child.classList.contains('bili-composition-more')) more = child;
        }
        if (tags.length >= 4) {
            tags.forEach(function (tag, index) {
                tag.style.display = index < 3 ? 'inline-flex' : 'none';
            });
            if (!more) {
                more = document.createElement('span');
                more.className = 'bili-composition-more';
                more.textContent = '更多';
                more.title = '展开全部成分标签';
                more.style.cssText = FONT
                    + 'display:inline-flex;align-items:center;justify-content:center;'
                    + 'margin:0 3px;padding:0 7px;height:16px;border-radius:10px;'
                    + 'background:rgba(7,190,255,.16);color:#07beff;cursor:pointer;'
                    + 'vertical-align:middle;';
                more.addEventListener('click', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    openMorePanel(wrapper);
                });
                const addButton = wrapper.querySelector('.bili-composition-manual-add');
                wrapper.insertBefore(more, addButton || null);
            }
        } else {
            tags.forEach(function (tag) { tag.style.display = 'inline-flex'; });
            if (more) more.remove();
        }
    }

    function insertManualTagInto(container, saved) {
        const wrapper = container.querySelector('.bili-composition-tags');
        const holder = wrapper || container;
        const addButton = holder.querySelector('.bili-composition-manual-add');
        const tag = makeManualTag(saved.name, saved.uid, saved.icon, saved.iconSource);
        if (addButton) holder.insertBefore(tag, addButton);
        else holder.insertBefore(tag, holder.firstChild);
        applyTagCollapse(holder);
    }

    function makeTag(checker, reasons, score) {
        const hasLink = /^https:\/\//i.test(checker.link || '');
        const tag = document.createElement(hasLink ? 'a' : 'span');
        if (hasLink) {
            tag.href = checker.link;
            tag.target = '_blank';
            tag.rel = 'noopener noreferrer';
            tag.style.textDecoration = 'none';
            tag.addEventListener('click', function (event) { event.stopPropagation(); });
        }
        tag.className = 'bili-composition-tag';
        tag.style.cssText = FONT
            + 'display:inline-flex;align-items:center;gap:3px;margin:0 3px;padding:0 5px;border-radius:4px;'
            + 'background:linear-gradient(135deg,#7c4dff,#e53935);color:#fff;vertical-align:middle;';
        if (reasons && reasons.length) {
            tag.title = '来自' + reasons.join('/');
        }
        if (checker.showIcon !== false) attachTagIcon(tag, checker.displayIcon);
        const name = document.createElement('span');
        name.textContent = checker.displayName;
        tag.appendChild(name);
        return tag;
    }

    function makeManualTag(name, uid, icon, iconSource) {
        const hasLink = /^\d+$/.test(String(uid || ''));
        const tag = document.createElement(hasLink ? 'a' : 'span');
        if (hasLink) {
            tag.href = 'https://space.bilibili.com/' + uid;
            tag.target = '_blank';
            tag.rel = 'noopener noreferrer';
            tag.style.textDecoration = 'none';
            tag.addEventListener('click', function (event) { event.stopPropagation(); });
        }
        tag.className = 'bili-composition-tag bili-composition-tag--manual';
        tag.title = '手动标注';
        tag.style.cssText = FONT
            + 'display:inline-flex;align-items:center;gap:2px;margin:0 3px;padding:0 5px;border-radius:4px;'
            + 'background:linear-gradient(135deg,#ff9800,#e53935);color:#fff;vertical-align:middle;';
        attachTagIcon(tag, icon);
        const label = document.createElement('span');
        label.textContent = name;
        tag.appendChild(label);
        return tag;
    }

    function openTagEditor(presetUid, onSave) {
        if (document.getElementById('bili-composition-tag-editor')) return;
        let selected = null;

        const overlay = el('div',
            'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);'
            + 'display:flex;align-items:flex-start;justify-content:center;' + FONT);
        overlay.id = 'bili-composition-tag-editor';
        const panel = el('div',
            'margin-top:8vh;width:min(640px,94vw);max-height:84vh;display:flex;flex-direction:column;'
            + 'background:#fff;color:#222;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.35);'
            + 'padding:16px 18px;');

        const header = el('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;');
        header.appendChild(el('div', 'font-size:16px;font-weight:700;', '手动添加标签'));
        const closeBtn = el('button',
            'border:none;background:#eee;border-radius:6px;padding:4px 10px;cursor:pointer;', '关闭');
        header.appendChild(closeBtn);
        panel.appendChild(header);

        const uidInput = el('input',
            'width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:6px;margin-bottom:8px;');
        uidInput.placeholder = '用户 UID';
        uidInput.value = presetUid || '';
        if (presetUid) uidInput.readOnly = true;
        panel.appendChild(uidInput);

        const nameInput = el('input',
            'width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:6px;margin-bottom:8px;');
        nameInput.placeholder = '标签名称';
        panel.appendChild(nameInput);

        const searchInput = el('input',
            'width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:6px;margin-bottom:8px;');
        searchInput.placeholder = '搜索规则图标（只列 showIcon=true 的规则）';
        panel.appendChild(searchInput);

        const preview = el('div', 'display:flex;align-items:center;gap:6px;margin-bottom:8px;color:#555;');
        panel.appendChild(preview);

        const list = el('div',
            'flex:1;min-height:120px;max-height:42vh;overflow:auto;display:grid;'
            + 'grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;'
            + 'border-top:1px solid #eee;padding-top:8px;');
        panel.appendChild(list);

        const message = el('div', 'color:#e53935;min-height:18px;margin-top:8px;');
        panel.appendChild(message);

        const actions = el('div', 'display:flex;justify-content:flex-end;gap:8px;');
        const cancelBtn = el('button',
            'border:none;background:#eee;border-radius:6px;padding:6px 14px;cursor:pointer;', '取消');
        const confirmBtn = el('button',
            'border:none;background:#07beff;color:#04222e;border-radius:6px;padding:6px 14px;'
            + 'cursor:pointer;font-weight:600;', '确定');
        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        panel.appendChild(actions);

        const iconRules = checkers.filter(function (checker) {
            return checker.showIcon !== false && /^https:\/\//i.test(checker.displayIcon || '');
        }).sort(function (a, b) {
            return a.displayName.localeCompare(b.displayName, 'zh');
        });

        function close() {
            document.removeEventListener('keydown', onKey);
            overlay.remove();
        }
        function onKey(event) {
            if (event.key === 'Escape') close();
        }
        document.addEventListener('keydown', onKey);
        closeBtn.addEventListener('click', close);
        cancelBtn.addEventListener('click', close);

        function renderPreview() {
            preview.textContent = '';
            if (!selected) {
                preview.appendChild(document.createTextNode('图标：无图标'));
                return;
            }
            preview.appendChild(document.createTextNode('图标：'));
            const image = document.createElement('img');
            image.alt = '';
            image.loading = 'lazy';
            image.src = selected.icon;
            image.style.cssText = 'width:20px;height:20px;border-radius:50%;';
            image.addEventListener('error', function () { image.remove(); });
            preview.appendChild(image);
            preview.appendChild(document.createTextNode(selected.source));
        }

        function selectItem(icon, source) {
            selected = icon ? { icon: icon, source: source } : null;
            renderPreview();
            renderList();
        }

        function renderList() {
            list.textContent = '';
            const term = searchInput.value.trim().toLowerCase();
            const none = el('div',
                'display:flex;align-items:center;gap:6px;padding:6px;border:1px solid #eee;'
                + 'border-radius:8px;cursor:pointer;', '无图标');
            none.style.borderColor = selected ? '#eee' : '#07beff';
            none.addEventListener('click', function (event) { event.stopPropagation(); selectItem('', ''); });
            list.appendChild(none);
            let count = 0;
            for (const rule of iconRules) {
                if (term) {
                    const names = [rule.displayName].concat(rule.aliases || []);
                    if (!names.some(function (name) { return name.toLowerCase().indexOf(term) !== -1; })) continue;
                }
                count++;
                const item = el('div',
                    'display:flex;align-items:center;gap:6px;padding:5px 6px;border:1px solid #eee;'
                    + 'border-radius:8px;cursor:pointer;min-width:0;');
                if (selected && selected.icon === rule.displayIcon) item.style.borderColor = '#07beff';
                const image = document.createElement('img');
                image.alt = '';
                image.loading = 'lazy';
                image.src = rule.displayIcon;
                image.style.cssText = 'width:24px;height:24px;border-radius:50%;flex:none;';
                image.addEventListener('error', function () { image.remove(); });
                item.appendChild(image);
                item.appendChild(el('span',
                    'font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;', rule.displayName));
                item.addEventListener('click', function (event) {
                    event.stopPropagation();
                    selectItem(rule.displayIcon, rule.displayName);
                });
                list.appendChild(item);
            }
            if (!count) {
                list.appendChild(el('div', 'color:#888;padding:6px;', '没有匹配的图标'));
            }
        }

        searchInput.addEventListener('input', renderList);

        confirmBtn.addEventListener('click', function () {
            const uid = uidInput.value.trim();
            const name = nameInput.value.trim();
            if (!/^\d+$/.test(uid)) {
                message.textContent = 'UID 必须是数字';
                return;
            }
            if (!name) {
                message.textContent = '标签名称不能为空';
                return;
            }
            const icon = selected ? selected.icon : '';
            const iconSource = selected ? selected.source : '';
            if (!addManualTag(uid, name, icon, iconSource)) {
                message.textContent = '该 UID 下已存在同名标签';
                return;
            }
            close();
            if (onSave) onSave({ uid: uid, name: name, icon: icon, iconSource: iconSource });
        });

        renderPreview();
        renderList();
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        nameInput.focus();
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
            openTagEditor(uid, function (saved) {
                const none = container.querySelector('.bili-composition-none');
                if (none) none.remove();
                insertManualTagInto(container, saved);
            });
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

    function createFloatingPanel(id, titleText, positionKey, onClose, defaultPos) {
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
            panel.style.left = ((defaultPos && defaultPos.left) || 16) + 'px';
            panel.style.bottom = ((defaultPos && defaultPos.bottom) || 16) + 'px';
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
            openTagEditor(currentUid, function (saved) {
                insertManualTagInto(result, saved);
            });
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
                openTagEditor(uid, function (saved) {
                    insertManualTagInto(result, saved);
                });
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

    function ensureUiStyle() {
        if (document.getElementById('bili-composition-ui-style')) return;
        const style = document.createElement('style');
        style.id = 'bili-composition-ui-style';
        style.textContent = [
            '#bili-composition-settings, #bili-composition-tag-editor { color-scheme: light; }',
            '#bili-composition-settings input:not([type="checkbox"]),',
            '#bili-composition-settings textarea,',
            '#bili-composition-tag-editor input:not([type="checkbox"]) {',
            '  color: #222 !important;',
            '  -webkit-text-fill-color: #222 !important;',
            '  background-color: #fff !important;',
            '  caret-color: #222 !important;',
            '  color-scheme: light;',
            '}',
            '#bili-composition-settings input::placeholder,',
            '#bili-composition-settings textarea::placeholder,',
            '#bili-composition-tag-editor input::placeholder {',
            '  color: #999 !important;',
            '  -webkit-text-fill-color: #999 !important;',
            '}'
        ].join('\n');
        (document.head || document.documentElement).appendChild(style);
    }

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
        const remoteOption = optionLine('使用远程规则库（镜像 → GitHub 直连 → 缓存/内置）', options.useRemoteRules);
        optionsBox.appendChild(followOption.label);
        optionsBox.appendChild(medalOption.label);
        optionsBox.appendChild(remoteOption.label);

        const rulesUrlInput = el('input',
            'width:100%;box-sizing:border-box;margin:4px 0;padding:5px 8px;border:1px solid #ccc;'
            + 'border-radius:6px;font-size:12px;');
        rulesUrlInput.placeholder = '规则库直连 URL';
        rulesUrlInput.value = options.rulesUrl;
        const mirrorInput = el('input',
            'width:100%;box-sizing:border-box;margin:4px 0;padding:5px 8px;border:1px solid #ccc;'
            + 'border-radius:6px;font-size:12px;');
        mirrorInput.placeholder = '镜像前缀，例如 https://ghproxy.net/';
        mirrorInput.value = options.mirrorPrefix;
        optionsBox.appendChild(rulesUrlInput);
        optionsBox.appendChild(mirrorInput);

        const scoreRow = el('label', 'display:flex;align-items:center;gap:6px;margin:6px 0 2px;');
        scoreRow.appendChild(document.createTextNode('成分判定阈值（1-5，默认 2）：'));
        const scoreInput = document.createElement('input');
        scoreInput.type = 'number';
        scoreInput.min = '1';
        scoreInput.max = '5';
        scoreInput.step = '1';
        scoreInput.value = String(options.minScore || DEFAULT_MIN_SCORE);
        scoreInput.style.cssText = 'width:64px;padding:4px 6px;border:1px solid #ccc;border-radius:6px;';
        scoreRow.appendChild(scoreInput);
        optionsBox.appendChild(scoreRow);

        const rulesStatus = el('div', 'color:#666;font-size:12px;margin-top:4px;', rulesStatusText());
        rulesStatusEl = rulesStatus;
        const refreshRulesBtn = el('button',
            'border:none;background:#e3f2fd;color:#1565c0;border-radius:6px;padding:4px 10px;'
            + 'cursor:pointer;margin-top:6px;', '立即刷新规则库');
        refreshRulesBtn.addEventListener('click', function () {
            rulesStatus.textContent = '正在刷新…';
            refreshRules(true).then(function (ok) {
                rulesStatus.textContent = rulesStatusText() + (ok ? '（已更新）' : '（未更新，使用现有规则）');
            });
        });
        optionsBox.appendChild(rulesStatus);
        optionsBox.appendChild(refreshRulesBtn);
        panel.appendChild(optionsBox);

        const manualBox = el('div', 'margin-bottom:12px;padding:8px 10px;border:1px solid #eee;border-radius:8px;');
        manualBox.appendChild(el('div', 'font-weight:600;margin-bottom:6px;', '手动标签（按 UID）'));
        const manualAdd = el('button',
            'border:none;background:#ff9800;color:#fff;border-radius:6px;padding:5px 12px;cursor:pointer;',
            '添加手动标签');
        const manualList = el('div', 'margin-top:6px;');
        manualBox.appendChild(manualAdd);
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
                if (item.icon) {
                    const image = document.createElement('img');
                    image.alt = '';
                    image.loading = 'lazy';
                    image.src = item.icon;
                    image.style.cssText = 'width:20px;height:20px;border-radius:50%;flex:none;';
                    image.addEventListener('error', function () { image.remove(); });
                    line.appendChild(image);
                }
                const label = el('div', 'flex:1;word-break:break-all;', item.uid + ' — ' + item.name);
                if (item.iconSource) label.title = '图标来自「' + item.iconSource + '」';
                line.appendChild(label);
                const del = el('button',
                    'border:none;background:#ffebee;color:#c62828;border-radius:6px;padding:2px 8px;cursor:pointer;',
                    '删除');
                del.addEventListener('click', function () {
                    removeManualTag(item.uid, item.name);
                    renderManualList();
                });
                line.appendChild(del);
                manualList.appendChild(line);
            });
        }
        manualAdd.addEventListener('click', function () {
            openTagEditor(null, function () { renderManualList(); });
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
        const defaultBtn = el('button', 'border:none;background:#eee;border-radius:6px;padding:6px 12px;cursor:pointer;', '恢复规则库');
        const clearUserBtn = el('button', 'border:none;background:#ffebee;color:#c62828;border-radius:6px;padding:6px 12px;cursor:pointer;', '清除自定义规则');
        const applyBtn = el('button',
            'border:none;background:#4caf50;color:#fff;border-radius:6px;padding:6px 14px;cursor:pointer;margin-left:auto;',
            '应用并关闭');
        toolActions.appendChild(exportBtn);
        toolActions.appendChild(importBtn);
        toolActions.appendChild(defaultBtn);
        toolActions.appendChild(clearUserBtn);
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
            draft = JSON.parse(JSON.stringify(libraryRules.checkers));
            editIndex = -1;
            message.textContent = '';
            renderList();
        });

        clearUserBtn.addEventListener('click', function () {
            userCheckers = [];
            try { GM_setValue(STORE_KEY, []); } catch (e) {}
            checkers = mergeCheckers(libraryRules.checkers, []);
            draft = JSON.parse(JSON.stringify(checkers));
            editIndex = -1;
            message.textContent = '已清除自定义规则，当前使用规则库';
            renderList();
        });

        applyBtn.addEventListener('click', function () {
            if (!draft.length) {
                message.textContent = '至少保留一个检查项';
                return;
            }
            const previousRemote = options.useRemoteRules + '|' + options.rulesUrl + '|' + options.mirrorPrefix;
            options = {
                useFollowings: !!followOption.input.checked,
                useMedals: !!medalOption.input.checked,
                useRemoteRules: !!remoteOption.input.checked,
                rulesUrl: rulesUrlInput.value.trim(),
                mirrorPrefix: mirrorInput.value.trim(),
                minScore: Math.min(5, Math.max(1, Math.round(Number(scoreInput.value) || DEFAULT_MIN_SCORE)))
            };
            saveOptions();
            checkers = draft;
            saveCheckers();
            overlay.remove();
            const currentRemote = options.useRemoteRules + '|' + options.rulesUrl + '|' + options.mirrorPrefix;
            if (options.useRemoteRules && currentRemote !== previousRemote) {
                refreshRules(true);
            }
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
        ensureUiStyle();
        installTagClickGuard();
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
        try {
            GM_registerMenuCommand('立即刷新规则库', function () {
                refreshRules(true).then(function (ok) {
                    console.info('[成分指示器] 规则库刷新' + (ok ? '成功' : '失败（使用缓存/内置）'));
                });
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
                version: '2.6.8',
                setDebug: setDebug,
                scan: scheduleScan,
                refreshRules: function () { return refreshRules(true); },
                get rulesInfo() { return rulesMeta; },
                get checkerCount() { return checkers.length; },
                get rulesError() { return rulesLastError; },
                get rulesVerified() { return !!rulesMeta.verified; },
                _createPanel: createFloatingPanel
            };
        } catch (e) {}
        refreshRules(false);
        console.info('[B站用户成分指示器] v2.6.8 已启动 | 规则库',
            rulesMeta.version, rulesMeta.count, '条 | 来源', rulesMeta.source);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
