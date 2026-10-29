# 素材许可证登记表 / Asset License Register

> 用途：记录本产品中第三方素材的「来源 → 许可证 → 凭证」，作为商用合规证据。
> 范围：仅覆盖 `audio/` 下的环境音（冥想体验背景层）。
> 建立日期：2026-10-29｜最近复核：2026-10-29

## 环境音（Ambient Sounds）

来源平台：**Mixkit**（Envato 旗下，https://mixkit.co/）
适用许可：**Mixkit Sound Effects Free License**
许可要点：
- ✅ 允许商业与个人用途
- ✅ **无需署名（no attribution required）**
- ✅ 可用于付费产品、广告、广播、影视
- ❌ 禁止将音效**单独转售**或以音效库/模板形式再分发
- ❌ 禁止注册 Content ID / 主张版权归属
- ⚠️ Mixkit **不提供侵权赔偿（no indemnity）**，风险自担
- ⚠️ 下载应走素材页手动下载，勿用脚本批量抓取

| 本地文件 | Mixkit 素材 ID | Mixkit 原标题 | 时长 | 许可 | 备注 |
|---|---|---|---|---|---|
| `audio/rain.mp3` | `2394` | Rain long loop | 57.10s | Free License | 随仓库 `public/audio/` 同步一份 |
| `audio/ocean.mp3` | `1196` | Sea waves loop | 48.27s | Free License | 随仓库 `public/audio/` 同步一份 |
| `audio/wind.mp3` | `1237` | Wind in the forest | 25.36s | Free License | 随仓库 `public/audio/` 同步一份 |
| `audio/fire.mp3` | `1329` | Campfire burning crackles | 14.11s | Free License | 随仓库 `public/audio/` 同步一份 |
| `audio/crickets.mp3` | `1789` | Summer night crickets loop | 42.03s | Free License | 随仓库 `public/audio/` 同步一份 |
| `audio/birds.mp3` | `2472` | Morning birds | 209.76s | Free License | 随仓库 `public/audio/` 同步一份 |

素材页 URL 格式：`https://mixkit.co/sound-effects/<slug>-<id>/`
（例：Rain long loop 对应 `.../rain-long-loop-2394/`，其余按标题 slug + ID 拼接；
如页面标注与下表不一致，以 Mixkit 素材页实时标注为准，并回写本表。）

## 来源沿革（避免误判）

- 初版（2026-10-15）：`rain/ocean/wind/fire` 取自 **SFXMint（CC0）**，`crickets/birds` 取自 Mixkit。
- 同日第二轮：用户要求「除虫声、鸟声外全部更换」，故 `rain/ocean/wind/fire` 也换成 Mixkit，
  `crickets/birds` 沿用 Mixkit。
- **当前仓库中已无任何 SFXMint 素材，6 个环境音全部来自 Mixkit Free License。**

## 合规使用边界（给产品的提醒）

1. 环境音仅作为冥想体验的「背景层」（叠加语音引导 + AI 可视化），属"创作的一部分"，合规。
2. **不得**将这 6 个音频单独打包成"自然音效包"售卖——那违反 Mixkit「禁止单独转售」条款。
3. 若将来引入新素材，须先在此表登记来源与许可证，再合入仓库。
4. 本表不随部署到 Vercel 的运行时必需，但应随源码提交，作为合规审计凭证。

## 待办

- [ ] 逐个打开 6 个 Mixkit 素材页，确认实时标注均为 Free License（非 Restricted），并将真实 URL 回填上表。
- [ ] 正式下载改为素材页手动下载，替换当初的预览直链抓取版本（内容版权不受影响，仅下载方式合规）。
