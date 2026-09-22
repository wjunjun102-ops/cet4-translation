# CET4 翻译真题 · 高频词自动发音助手

一个纯静态的单页练习站，覆盖 **2019 — 2026 年大学英语四级翻译真题（41 套）**。
界面参考「预热/秒哒」风格的四级助手页面，左侧导航 + 右侧题卡，暖白纸感配色。

## 功能

| 视图 | 说明 |
| --- | --- |
| **翻译真题** | 主视图。年份/套数网格选题 → 中文原文 → 显示参考译文、重点词汇与考点 → 记忆自评 |
| **学习** | 358 个真题高频词的单词卡片，支持自动发音（浏览器语音合成） |
| **词库** | 按出现次数排序的词条检索，可按年份筛选，点击可跳回原题 |
| **复习** | 按自评结果做间隔重复（不熟 1 天 / 一般 3 天 / 熟练 7 天），显示今日待复习 |
| **统计** | 练习进度、自评题数、平均记忆强度、分年份完成度，支持导出/清空本机记录 |

其它细节：

- 快捷键：`←` / `→` 翻题，`Ctrl`/`⌘` + `Enter` 显示参考译文
- URL 会带当前题号（如 `index.html#2025-06-03`），刷新/分享都能回到同一题
- 学习记录存在浏览器 `localStorage`，不联网、不上传
- 无构建步骤、无依赖，任意静态服务器（或直接双击 `index.html`）即可运行

## 目录结构

```
cet4-translation/
├── index.html            页面结构（侧栏 + 5 个视图）
├── cet4-translation-standalone.html  单文件版（双击即可打开，全部资源已内联）
├── assets/
│   ├── style.css         样式（暖纸砂橙·升级版，颜色都在 :root 里）
│   ├── data-a.js         题库：2026 — 2024
│   ├── data-b.js         题库：2023 — 2022
│   ├── data-c.js         题库：2021 — 2019
│   └── app.js            应用逻辑（视图、作答、复习、统计、发音）
└── tools/
    ├── fetch_data.py     从真题站刷新中文原文的脚本
    ├── build_standalone.py  打包单文件版
    ├── deploy-surge.sh     打包并发布到公网（surge.sh）
    ├── tunnel.sh           临时公网预览（cloudflared 快速隧道）
    ├── service-install.sh   安装 macOS 常驻服务（登录自启 + 崩溃自愈）
    ├── service-uninstall.sh 卸载常驻服务
    └── show-address.sh      打印当前所有可访问地址
```

双击入口：**`发布到公网.command`**（发布到 surge.sh）、**`cet4-translation-standalone.html`**（离线单文件）。

## 常驻访问（推荐：一次配置，永久可用）

项目自带 macOS 常驻服务脚本，**登录后自动启动、崩溃自动重启**，不需要每次手动开服务，
同一 Wi-Fi 下的手机、平板也能直接打开。

```bash
bash tools/service-install.sh      # 安装并启动
bash tools/show-address.sh         # 查看当前可访问地址
bash tools/service-uninstall.sh    # 卸载
```

安装后会得到三个地址：

| 地址 | 说明 |
| --- | --- |
| `http://127.0.0.1:8848/` | 本机打开 |
| `http://<你的电脑名>.local:8848/` | **换 Wi-Fi 也不变**，iPhone / iPad / Mac 可用（Bonjour） |
| `http://<当前局域网IP>:8848/` | 安卓等无法解析 `.local` 的设备用它；IP 会随网络变化 |

> **关于「固定 IP」**：家用路由器分发的 IP 可能变化。若要让 IP 也长期不变，
> 在路由器里给这台 Mac 的 MAC 地址做「DHCP 保留 / 静态地址分配」即可（一次设置，长期有效）；
> 不改路由器的话，日常用上面的 `.local` 主机名最省心。

**为什么服务跑在 `~/Sites/cet4-translation` 而不是项目目录？**
macOS 的隐私保护（TCC）禁止后台服务读取 `~/Desktop`、`~/Documents`、`~/Downloads`，
直接指向项目目录会报 `Operation not permitted`。所以 `service-install.sh` 会把站点同步到
`~/Sites/cet4-translation`，服务从那里提供。

⚠️ 因此：**改完源码后，重新执行一次 `bash tools/service-install.sh` 才会同步到常驻服务。**

## 部署到公网

站点是**纯静态**的，可以直接放到任意静态托管上，得到固定网址、不需要开电脑、不需要隧道。

**① 一键发布（推荐，免费固定子域名，无需自备域名）**

在 Finder 里双击项目根目录的 **`发布到公网.command`**，按提示输入一次邮箱和密码即可。
发布后地址固定为：

```
https://cet4-translation.surge.sh
```

（命令行的等价写法：`bash tools/deploy-surge.sh [子域名]`）

**② 网页拖拽（不用命令行）**

先执行 `bash tools/deploy-surge.sh` 里的打包步骤，或直接手工准备：
把 `index.html`、`assets/` 放进一个文件夹（`dist/` 就是现成的），然后拖到：

| 平台 | 入口 | 结果 |
| --- | --- | --- |
| Netlify Drop | https://app.netlify.com/drop | 得到 `xxx.netlify.app` |
| Cloudflare Pages | https://pages.cloudflare.com → 上传资产 | 得到 `xxx.pages.dev` |
| Vercel | https://vercel.com/new → 导入/上传 | 得到 `xxx.vercel.app` |

**③ 临时公网预览（无需账号，但地址会变）**

```bash
bash tools/tunnel.sh          # 启动，打印 https://xxxx.trycloudflare.com
bash tools/tunnel.sh stop     # 关闭
```

> ⚠️ 两点注意：
> ① 快速隧道地址**每次重启都会变**，且部分网络的 DNS 会拦截 `*.trycloudflare.com`
> （表现为打不开、提示找不到服务器），只适合临时给别人看一眼。
> ② 隧道会把本机服务暴露到公网，任何人拿到地址都能访问，浏览完记得 `stop`。


## 其它打开方式

**① 单文件版（最省事）**

双击 `cet4-translation-standalone.html` 即可。CSS、题库、逻辑全部内联在这一个文件里，
不依赖 `assets/` 目录、不需要本地服务器，直接拷到 U 盘/微信传给别人也能用。
修改源码后重新生成：

```bash
python3 tools/build_standalone.py
```

**② 本地服务器（临时用，开发调试）**

```bash
cd cet4-translation
python3 -m http.server 8848
# 打开 http://127.0.0.1:8848/
```

**③ 直接打开 index.html**

双击 `index.html` 也可以，但要求 `assets/` 目录与它保持在同一层级、不能被单独移动，
否则题库脚本加载不到会提示「题库未能加载」。

> 注意：方式 ② 的 `http://127.0.0.1:8848` 只有在服务器**正在运行**时才能访问；
> 关掉终端后就会打不开（报「无法连接」）。想一劳永逸请用上面的常驻服务。

## 配色

「暖纸砂橙 · 升级版」：保留原来的暖米白纸感与砂橙强调色，并整体提高文字对比度与层次。
全部颜色集中定义在 `assets/style.css` 顶部的 `:root`，改主题只需换这一组变量：

| 变量 | 值 | 用途 |
| --- | --- | --- |
| `--paper` / `--paper-2` / `--paper-3` | `#ffffff` / `#fdfaf5` / `#f6f0e5` | 页面、面板、浅色块 |
| `--sidebar-bg` / `--sidebar-active` | `#f6f2e9` / `#e9dfc9` | 侧栏底色、选中导航 |
| `--ink` / `--ink-2` / `--ink-3` / `--muted` | `#241f19` / `#423a30` / `#5f574b` / `#7e7667` | 由强到弱的四级文字 |
| `--line` / `--line-soft` | `#e6ddcd` / `#efe8dc` | 边框、分隔线 |
| `--accent` / `--accent-hi` / `--accent-deep` | `#b8501f` / `#c25a24` / `#943c14` | 砂橙强调色（常态 / 悬停 / 深色） |
| `--accent-line` / `--accent-soft` | `#e3c3ad` / `#fbf2ea` | 强调色描边、浅底 |
| `--selected` | `#3b322a` | 套数选中态（暖调深咖） |

## 数据说明

- **中文原文**：来自 [英语真题在线](https://zhenti.burningvocabulary.cn/cet4) 各套试卷的 Part IV Translation。
  该站每套试卷以 PDF 形式提供，脚本 `tools/fetch_data.py` 会解析页面里的 `globalConfig`，
  推导出 PDF 地址（`{pdfHost}/images/read/{filePath}/{反序拼接的文件名}.pdf`）并抽取中文段落。
  2020 年部分试卷的中文为图片/非 Unicode 字体，无法直接抽取，已按试卷页面人工核对录入。
- **参考译文 / 重点词汇 / 考点解析**：在 `assets/data-*.js` 中人工整理，供对照学习使用。
- 本站仅供个人学习使用，题目版权归原作者与出版方所有。

### 刷新题库

```bash
pip3 install pymupdf
python3 tools/fetch_data.py --since 2019 --out raw_passages.json
```

脚本会输出每套试卷的中文原文，并标记文本层缺失、需要人工补录的试卷。
拿到新的原文后，按现有结构追加到 `assets/data-*.js` 即可（字段：`id / year / month / set / label / title / zh / en / words / points`）。

## 数据结构

```js
{
  id: "2025-06-03",                       // 唯一标识，用于 URL 与学习记录
  year: 2025, month: 6, set: 3,
  label: "2025年6月（第3套）",             // 题卡左上角徽标
  title: "2025年6月大学英语四级真题 · 翻译", // 题卡右上角出处
  zh: "近年来，中国东北地区……",            // 中文原文
  en: "In recent years, northeast China…", // 参考译文
  words: [["冰雪资源", "ice and snow resources"], …],
  points: ["“正在大力开发”用现在完成进行时……", …]
}
```
