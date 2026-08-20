# Luminara — 部署与商业化路线图

> 面向海外市场的显化（manifestation）工具 PWA。本文档说明如何把它从「本地 demo」变成「可赚钱的线上产品」。

---

## 一、现状体检（出发前先看清）

| 项目 | 当前状态 | 商业化是否够用 |
|------|----------|----------------|
| 前端界面 | ✅ 完成，3 套皮肤，可切换 | 够用 |
| PWA 安装 | ✅ manifest + Service Worker | 够用 |
| 数据存储 | ⚠️ 仅浏览器 `localStorage` | ❌ 用户换设备/清缓存数据就没了 |
| 账号体系 | ❌ 无 | ❌ 无法做订阅、无法找回数据 |
| 支付 | ❌ 无 | ❌ 无法收钱 |
| 后端 | ❌ 无 | ❌ 无法做云同步、推送、AI 功能 |
| 合规页 | ❌ 无隐私政策 / 条款 | ❌ 上架 App Store / 跑广告会被拒 |

**结论**：现在它是一个「漂亮的本地 App」。要商业化，最小必须补齐 **账号 + 支付 + 合规页** 三块；要做成「跨设备同步 + AI 音频」的高端产品，还需加 **后端**。

---

## 二、第一步：先上线一个稳定可访问的网站（0 成本起步）

当前项目是纯静态文件（HTML/CSS/JS），**不需要服务器**，最适合用以下平台：

### 方案 A：Vercel（海外最推荐，开发者首选）
1. 把 `manifestation-pwa/` 整个目录推到 GitHub 私有/公开仓库
2. 登录 vercel.com → Import 该仓库 → Framework 选 "Other" → 直接 Deploy
3. 已为你准备好 `vercel.json`（SW 不缓存、manifest 类型正确）
4. 自动得到 `xxx.vercel.app` 域名，HTTPS 自带

### 方案 B：Netlify（拖拽即可，最省事）
1. 登录 netlify.com → "Add new site" → "Deploy manually"
2. 直接把 `manifestation-pwa/` 文件夹拖进去
3. 已准备好 `netlify.toml`
4. 得到 `xxx.netlify.app` 域名

### 方案 C：Cloudflare Pages（最快、全球 CDN 强）
- 连 GitHub → 构建命令留空、输出目录 `.` → 部署

> ⚠️ 之前用 CloudStudio 生成的链接是**临时沙箱**，不适合长期商业运营，仅用于演示。正式上线请用上面三个之一。

### 绑定自己的域名（让它像真产品）
- 在 Vercel/Netlify 后台 "Domains" 添加 `yourbrand.com`
- 去域名商（Namecheap / Cloudflare / GoDaddy）加两条 CNAME 记录
- 建议买 `.com` 或 `.app`（`.app` 强制 HTTPS，很适合 PWA），海外显化类常用词：`luminara`, `manifest`, `align`, `awaken`, `soul`, `orbit` 等

---

## 三、第二步：商业化模式（怎么赚钱）

显化类 App 海外已验证的变现方式，按推荐度排序：

### 1. 免费增值（Freemium Subscription）— 最主流
- **Free**：$0，基础 369、肯定语、感恩、冥想计时
- **Pro**：$4.99/月 或 $39.9/年，解锁：云同步、AI 生成个性化音频、无限愿景板、专属呼吸音景、去广告
- 参考竞品：ThinkUp（$19.99/年）、I Am（$59.99/年，偏贵）、Manifest（$4.99/月）

### 2. 一次性买断（Lifetime）
- 上线初期促销 `$29.9 终身` 冲榜、攒早期用户和评价

### 3. 联盟营销（Affiliate）
- 在 "Shop / Resources" 推相关书籍、水晶、课程，赚佣金（Amazon Associates / ShareASale）

### 4. 打赏 / 一次性小贴士
- 适合早期没做支付时，用 Stripe Payment Link 或 Ko-fi

### 支付通道
- **网页 / PWA**：Stripe（海外最稳，支持信用卡+Apple/Google Pay）
- **上架后**：App Store / Google Play 内购（必须用平台支付，不能用 Stripe 绕开）

---

## 四、第三步：上架到手机应用商店（像原生 App）

纯 PWA 用户要「添加到主屏幕」才像 App，转化率低。要真正「在商店里搜到」，用 **Capacitor** 把它包成原生壳：

1. `npm create cap` 初始化，把 `manifestation-pwa/` 作为 web 资源
2. 加 iOS / Android 平台 → 在 Xcode / Android Studio 打开
3. 配置图标、启动屏、权限
4. iOS 上架需 Mac + $99/年 开发者账号；Android 需 $25 一次性
5. **订阅内购**接 **RevenueCat**（统一处理 iOS/Android/Stripe 订阅，省心）

> 上架必须用平台内购收款，且**必须有隐私政策页和 EULA**，否则审核被拒。

---

## 五、必须补的工程（商业化前置）

| 模块 | 推荐技术 | 说明 |
|------|----------|------|
| 账号 + 云同步 | **Supabase**（开源，自带 Auth + Postgres + 实时）或 Firebase | 用户注册/登录、跨设备同步数据 |
| 支付 | Stripe（网页）/ RevenueCat（上架） | 订阅管理 |
| 合规页 | 自建 `/privacy` `/terms` 页面 | 隐私政策、服务条款、EULA |
| AI 音频（高端卖点） | OpenAI TTS / ElevenLabs + 后端 | 生成个性化冥想音频（提示词里提到的卖点） |
| 分析 | Plausible（隐私友好）/ PostHog | 看留存、转化，不含 GA 侵犯隐私 |

---

## 六、合规清单（上架 & 收款必备）

- [ ] 隐私政策（Privacy Policy）—— 说明收集什么、怎么用、GDPR/CCPA 合规
- [ ] 服务条款（Terms of Service）
- [ ] 应用内购买说明 / EULA
- [ ] 未成年人保护（显化类常含冥想，注意年龄分级）
- [ ] 数据删除入口（GDPR「被遗忘权」）

---

## 七、成本估算（起步阶段）

| 项目 | 月成本 | 备注 |
|------|--------|------|
| 托管（Vercel/Netlify/CF） | $0 | 流量不大免费档足够 |
| 域名 | ~$12/年 | `.com` 约 $10–15/年 |
| 后端（Supabase/Firebase） | $0–25 | 免费档起步 |
| Stripe 手续费 | 2.9% + $0.3/笔 | 成交才收 |
| App 上架 | iOS $99/年 + Android $25 | 一次性/年费 |
| AI 音频 | ~$0.01–0.05/分钟 | 按量 |

**起步几乎 0 成本**，先跑通「网站 + 免费增值 + Stripe」，验证有人愿意付费，再考虑上架烧钱。

---

## 八、建议的推进顺序

1. **本周**：推 GitHub → Vercel 上线 → 绑域名 → 在海外社群（Reddit r/lawofattraction、TikTok #manifestation）发种子用户
2. **第 2–3 周**：加 Supabase 账号 + 云同步 + 隐私/条款页
3. **第 4 周**：接 Stripe 做 Free/Pro 订阅墙
4. **1–2 月**：上架 iOS/Android（Capacitor + RevenueCat），冲榜攒评价
5. **之后**：加 AI 个性化音频（差异化高端卖点）

---

## 九、我可以继续帮你做的

- ✅ 加 **Supabase 账号 + 云同步**（让数据跨设备不丢）
- ✅ 生成 **隐私政策 / 服务条款** 页面（合规）
- ✅ 加 **Stripe 订阅墙**（Free / Pro）
- ✅ 用 Capacitor **打包成 iOS/Android** 可上架壳
- ✅ 加 **AI 生成个性化冥想音频**
- ✅ 帮你把项目**推到 GitHub 并连 Vercel 一键部署**

告诉我先做哪一步。
