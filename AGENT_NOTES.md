# Agent 持久记忆文件

> 本文件用于跨会话、跨长对话记住用户的固定要求。任何新会话开始工作前，请先读取本文件并据此执行。
> 用户原话：**"之后你再让我修改什么前端 UI 内容的时候，不用再出现功能使用上的问题了。"**

## 黄金规则

修改**前端 UI**（index.html / public/index.html / app.js / public/app.js 等）时，**绝对不允许引入功能使用上的问题**（不崩溃、不回归、不出现"后端成功但前端不显示"之类）。

## 具体执行清单（每次改 UI 都必须遵守）

1. **删元素必查 JS 引用**
   删除/隐藏某个按钮、元素、功能时，除了改 HTML，必须全局搜索它在 JS 里的所有引用（变量声明、事件监听、`.disabled`、`getElementById/$`、`.addEventListener` 等），全部一起清理干净。**严禁遗留会触发 `ReferenceError` 或失效引用的死代码。**
   - 案例教训：删「Supabase Cloud Key / 免费照片按钮」时删掉了 `var btnFree = $('#aiBtnFree')` 的声明，却漏删成功/失败回调里 `if (btnFree) btnFree.disabled = false;` 4 处，导致照片生成成功但前端抛 ReferenceError、不渲染结果。

2. **成对同步**
   `index.html` ↔ `public/index.html`，以及 `app.js` ↔ `public/app.js` 必须保持一致，避免根目录/线上加载的版本不一致。（本地 server.js 优先服务 public/，再把根目录兜底。）

3. **改动后做 JS 体检**
   删完代码后，grep 搜索残留的未定义变量 / 失效 ID，确认不会运行时崩溃。

4. **缓存版本号同步升**
   改完 front-end 后检查 `<script src="app.js?v=...">` 的 `?v=` 是否要更新。**本项目 vercel.json 对所有 .js/.css 设了 `public, max-age=31536000, immutable`（1 年不可变缓存）**，URL 不变浏览器就永远用旧缓存。所以发布前端改动时必须同步升 index.html 里的 `?v=` 版本号，必要时可考虑收紧该缓存策略。

5. **涉及删除逻辑先确认**
   删除任何功能/逻辑前，先确认它不影响现有功能；有不确定处先问用户。

## 项目部署须知

- Vercel 部署的是 **main** 分支上的代码（工作流：功能分支 → 合并 PR 到 main → 自动部署）。
- 前端修复若只在功能分支上，main 不会有，线上不会生效；必须合并进 main。
- `supabase/functions/xianhuaapp/index.ts` 是后端边缘函数，前端 bug 一般不改它、也不需重部署（除非涉及后端）。