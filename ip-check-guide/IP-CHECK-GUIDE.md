# IP 质量检测指南（海外社媒运营用）

> 用途：判断一条代理 IP 是「真住宅 / ISP 代理 / 机房 IP」，以及能不能用在 TikTok 等账号上。
> 独立于项目文件，可单独下载保存。

---

## 一、核心逻辑：IP 分三级

| 级别 | 类型 | 典型 ASN / 组织 | 能不能用在号上 |
|---|---|---|---|
| **A** | 移动网络 IP（4G/5G） | T-Mobile、Verizon Wireless、AT&T Mobility | ✅ 最好是，最像真人 |
| **B** | 住宅 / ISP 代理 | Comcast、Verizon Fios、AT&T、Spectrum、Metronet | ✅ 可以用 |
| **C** | 机房 / 云 / 数据中心 | AWS、Google Cloud、Linode、Akamai、DigitalOcean、Vultr | ❌ 不要用 |

**B 级里还有细分：**
- **B+** 真住宅：rDNS 形如 `c-xx-xx-xx-xx.hsd1.ca.comcast.net`
- **B-** ISP 代理：ARIN 注册在真 ISP，但 rDNS 是代理商域名（如 `aceips.com`）、滥用联系人是数据中心的

---

## 二、检测三步法（按顺序）

### 第 1 步：查注册局（最权威，决定成败）

**网页：**
```
https://rdap.arin.net/registry/ip/你的IP
https://whois.arin.net/rest/ip/你的IP
```

**命令：**
```bash
curl -s "https://rdap.arin.net/registry/ip/205.186.118.7"
```

**看三个字段：**
| 字段 | 含义 | 怎么判 |
|---|---|---|
| `name` / registrant | 网段注册人 | 是 ISP（Comcast/Metronet）还是云厂商（Amazon/Linode） |
| abuse 联系人 org | 滥用联系人单位 | 出现 `Data Centers` / `Hosting` / `Cloud` → 机房 |
| （下一步）rDNS | 反向解析 | 见第 2 步 |

> 这一步是原始记录，比任何"IP 检测站"都准。

### 第 2 步：查 ASN + 反向解析（暴露真实身份）

**网页：**
```
https://ipinfo.io/你的IP
```

**命令：**
```bash
curl -s "https://ipinfo.io/205.186.118.7/json"
curl -s "https://ipinfo.io/205.186.118.7/hostname"
```

**关键看 hostname（rDNS）：**

| rDNS 形态 | 结论 |
|---|---|
| `c-73-12-34-56.hsd1.ca.comcast.net` | ✅ 真住宅 |
| `205-186-118-7.aceips.com` | 🟡 ISP 代理（Ace IP Services） |
| `ec2-xx-xx-xx-xx.compute.amazonaws.com` | ❌ AWS 机房 |
| `li1234-56.members.linode.com` | ❌ Linode 机房 |
| 无 rDNS 或指向公司域名 | 🟡 多半是代理/机房 |

### 第 3 步：查风险站（交叉验证，只做参考）

```
https://scamalytics.com/ip/你的IP           ← 看 Datacenter 是否 In Use、黑名单
https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test/lookup/你的IP
https://ping0.cc/                            ← 中文可视化（聚合数据）
https://whoer.net/                           ← 看 DNS 泄漏、时区一致性
```

**看这几项：**
- **Datacenter：必须 `No`**（显示 `In Use` 就是机房）
- 黑名单（Firehol / IPSum / Spamhaus 等）：越少越好
- Tor / VPN / Proxy：必须全 No
- Fraud Score：低分好，但**注意**：很多站的"低分"只是因为"查不到滥用记录"，不代表适合运营

---

## 三、判断口诀（记这几条就够）

```
1. Datacenter = No              → 才可能是住宅
2. ASN 属于 Comcast/Verizon/AT&T/Spectrum/Metronet → ISP 段
3. ASN 是 16509/14618/15169/396982/63949/20473 → 云/机房，直接否
4. rDNS 是 xxx.hsd1.xx.comcast.net 格式 → 真住宅
5. rDNS 是代理商域名（aceips/iproyal/oxylabs…）→ ISP 代理，B-
6. 滥用联系人写 Data Centers / Hosting → 机房
```

---

## 四、实战案例（同一个 IP 在不同站会打架）

### 案例 IP：205.186.118.7

| 数据源 | 结论 |
|---|---|
| ARIN 注册局 | 注册人 **Metronet**（真 ISP），滥用联系人 **Ace Data Centers** |
| ipinfo.io | AS3561 CenturyLink，rDNS `205-186-118-7.aceips.com` |
| Scamalytics | Akamai Data Centers / **Datacenter: In Use** |
| 某中文质量站 | 住宅、Cable/DSL、CenturyLink、118/150 分「优良」 |

**真相：这是「ISP 代理」（B- 级）**
- 有真 ISP（Metronet）的注册记录 → 比纯机房强
- 但 rDNS 暴露 `aceips.com`、滥用联系人是数据中心 → 不是真住宅
- 那个中文站显示的"CenturyLink 住宅"是**过期数据**

### 案例 IP：96.126.142.192

| 项目 | 结果 |
|---|---|
| ISP / 组织 | **Linode, LLC（Akamai）** |
| 连接类型 | Data Center / Web Hosting |
| PTR | `usepro.mailharvest.com`（邮件营销） |
| 结论 | ❌ **C 级机房，不要用在号上** |

---

## 五、五个常见坑

1. **只看一个检测站** → 一定要交叉验证，以 ARIN + rDNS 为准
2. **信「Fraud Score 低 = 好」** → 多数是"没查到滥用记录"，机房 IP 也常常低分
3. **信中文质量站的"住宅/优良"** → 常是过期 GEOIP 映射（IP 段易主后数据没更新）
4. **忽略检测站的赞助商** → 页面底部写 `sponsored by xxx proxy` 的，分数天然乐观
5. **被"ISP Proxy / 专线"话术骗** → 商家普遍拿机房 IP 当住宅卖，务必自己查 ARIN

---

## 六、我查不了的（要自己实测）

| 项目 | 怎么测 |
|---|---|
| 真实延迟 / 速度 | 手机上 `ping` / speedtest |
| 是否独享 | 问商家，或同时两台设备测速对比 |
| 是否掉线 | 挂 24 小时观察 |
| 平台内部风控库 | 谁都看不到，只能靠实际账号表现反推 |

---

## 七、一键脚本

见同目录 `ipcheck.sh`：

```bash
chmod +x ipcheck.sh
./ipcheck.sh 205.186.118.7
./ipcheck.sh 1.2.3.4 5.6.7.8 9.10.11.12   # 批量
```

输出：注册人、ASN/组织、rDNS、初步分级建议。
