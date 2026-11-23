# BilibiliUserChecker（Fork 维护版）

在 [klxf/BilibiliUserChecker](https://github.com/klxf/BilibiliUserChecker) 2.4 基础上重写的 B 站「查成分」油猴脚本，适配新版评论区（Web Components + Shadow DOM），并把规则库与代码分离，便于长期维护。

> 本项目是社区 Fork，与 B 站官方及原项目作者无隶属关系。原项目以 GPLv3 发布，本项目同样以 GPLv3 发布并保留原作者署名。

## 当前状态

- 脚本版本：**2.6.1**（`Checker.user.js`，内置 238 条规则）
- 规则库：**2026.11.23**（`rules/rules.json`，238 条：147 款游戏 + 91 个主播/UP 主）
- 已实现：Shadow DOM 递归扫描、按钮预显示（点击才查询）、动态关键词 / 关注 / 粉丝牌 / 粉丝牌名称判定、命中原因提示、手动标签、悬浮面板拖拽关闭、可点击标签跳转、主播不显示头像、远程规则库（镜像 → 直连 → 缓存 → 内置）。
- **尚未实现**：GitHub 仓库图标兜底、手动标签图标选择器、远程规则的签名/完整性校验。

## 目录结构

```
Checker.user.js        油猴脚本（安装这个）
rules/rules.json       规则库数据（游戏 / 主播 / 图标 / 官方账号链接）
list.txt               规则库源数据（名称|UID，按分类标题分组）
tools/build_rules.py   从 list.txt 生成 rules.json 的工具（会请求 B 站接口）
tools/embed_rules.py   把 rules.json 注入 Checker.user.js 的内置规则区段
LICENSE                GPLv3
README.md
```

`.cache/` 为工具抓取 B 站昵称/头像的本地缓存，已被 `.gitignore` 忽略。

## 安装

1. 安装 Tampermonkey（Edge / Chrome）。
2. 将 `Checker.user.js` 拖入浏览器或新建脚本粘贴内容。
3. 打开 B 站视频页，评论区用户名旁会出现「查成分」。

注意：本仓库暂未配置 `@updateURL`，更新脚本需重新安装文件。

## 规则库格式

`rules/rules.json` 是纯数据文件，每个条目字段如下：

| 字段 | 说明 |
|---|---|
| `displayName` | 标签显示名称 |
| `category` | `game` / `streamer` / `other` |
| `showIcon` | 是否显示头像（主播建议 `false`） |
| `displayIcon` | 头像 URL（优先 B 站官方账号头像） |
| `keywords` | 动态关键词 / 粉丝牌名称匹配词 |
| `followings` | 官方账号或主播的 UID 列表（关注、粉丝牌信号） |
| `link` | 点击标签跳转的目标（B 站空间/直播间），留空则不可点击 |
| `group` | 在 `list.txt` 中的分类标题，便于维护 |
| `aliases` | B 站接口返回的官方昵称（与列表名不一致时记录） |

维护规则时请：

- 只使用可核实的官方账号 UID，不要猜测；
- 图标引用 B 站 CDN 官方头像 URL，不在仓库中再分发游戏图片；
- 关键词避免过于宽泛（如「崩坏」「米哈游」会跨多款游戏）；
- 主播条目 `showIcon` 设为 `false`，且不写关键词，优先依赖关注/粉丝牌信号；
- 修改 `list.txt` 后重新生成 `rules.json`，再做 JSON 校验。

## 重新生成规则库

```bash
python tools/build_rules.py --proxy http://127.0.0.1:7897
python tools/embed_rules.py
```

- 数据源为 `list.txt`，工具通过 B 站 `card` 接口补齐官方昵称与头像；
- 抓取结果缓存在 `.cache/cards.json`，`--delay` 可调整请求间隔；
- 工具会打印名称与接口不一致的条目（当前为「星际争霸2 → 星际争霸官方」「绝地潜兵2 → 绝地潜兵官方」）；
- 游戏条目使用名称/官方昵称作为关键词；主播条目不写关键词，避免昵称误伤；
- `embed_rules.py` 会把 `rules.json` 写入脚本内置规则区段，用于首次无网络或远程失败时的兜底。

## 远程规则库（2.6.0 已实现）

运行时从本仓库拉取 `rules/rules.json`，规则更新无需重装脚本。

1. **多级数据源**：设置里可配置「镜像前缀」和「直连 URL」，默认按 `ghproxy → GitHub 直连 → 本地缓存 → 脚本内置` 顺序回退；
2. **缓存与节流**：成功结果写入 GM 存储，24 小时内不重复拉取；失败后 1 小时内不自动重试，手动刷新不受限制；
3. **校验**：只接受 JSON、限制条目数量/字段长度；`displayIcon`、`link` 仅允许 `https:`，不接受远程代码；
4. **合并**：远程库与脚本内置规则作为“规则库”，用户自定义规则按 `displayName` 覆盖同名项，手动标签独立存储；设置里可「清除自定义规则」回到规则库；
5. **展示**：设置面板显示规则库版本、条数、来源（远程 / 缓存 / 内置），支持「立即刷新规则库」，TM 菜单也有入口；
6. **网络现实**：默认地址指向本 Fork 的 `raw.githubusercontent.com`，直接访问在你所在网络不可用，因此必须先尝试 `ghproxy.net` 镜像；仓库推送前远程会 404，此时使用内置 238 条规则。

## 后续目标

1. [x] 规则 schema 升级（category / showIcon / link / 粉丝牌名称匹配），兼容旧设置；
2. [x] 扩充游戏库、游戏图标、主播名称库（主播不显示头像）；
3. [x] 成分标签可点击，跳转 B 站官方账号（手动标签跳转用户空间）；
4. [ ] 手动添加标签时从现有规则图标中选择（2.6.2）；
5. [x] 远程规则库拉取与缓存；
6. [ ] GitHub 仓库图标兜底（CDN 失败时依次尝试镜像/直连，2.6.1）；
7. [ ] 远程规则的签名或完整性校验（可选）。

## Fork / 发布流程

本仓库已经基于上游 `upstream/main` 的历史（上游最后提交 2024-01-23），并在其上有一个 Fork 提交，本地无需再次 rebase。

1. 在 GitHub 页面 Fork `klxf/BilibiliUserChecker`；
2. 在本目录执行：
   ```bash
   git remote add origin https://github.com/<你的账号>/BilibiliUserChecker.git
   git push -u origin main
   ```
   如果 Fork 的默认分支不是 `main`，请相应调整；推送前可先 `git fetch origin` 确认没有新提交。
3. 之后在 Fork 仓库中维护 `rules/rules.json`，按需发布脚本版本。

## Credit

- 原项目：[klxf/BilibiliUserChecker](https://github.com/klxf/BilibiliUserChecker)（klxf、trychen、miayoshi），最后更新于 2024-01-23；
- 更早版本修改自 [A畜3畜野狗大杂烩指示器](https://greasyfork.org/zh-CN/scripts/451236)；
- 本项目适配新版评论区 Shadow DOM，并新增规则库、手动标签等能力。

## 其他

- 脚本内置的规则不针对任何组织或个人；
- 本脚本仅供娱乐，请勿借此攻击他人。

## 声明

- 所有判定均基于公开信息（动态、关注列表、粉丝牌），结果仅供参考，不代表用户真实偏好；
- 游戏名称、图标、官方账号等权利归各自权利人所有，本项目仅引用公开链接；
- 本项目不收集、不上传任何用户数据；远程规则拉取只下载静态 JSON。

## License

GPLv3，详见 [LICENSE](LICENSE)。
