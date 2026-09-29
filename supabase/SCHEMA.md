# Supabase 线上库结构（public schema）

> 本文件是**线上数据库的真实快照**，用于替代反复让用户贴表结构。
> 数据来源：`information_schema.columns` / `information_schema.views` / `pg_proc` 查询结果截图。
> 快照时间：2026-09-29 · project ref `bnxjwnvsmiqofbjiknwf`
> **改过 schema 后请顺手更新本文件。**

---

## 一、表（13 张）

### active_days
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | day | date | NO | `CURRENT_DATE` |

### affirm_custom
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | text | text | NO | — |
| 4 | created_at | timestamptz | YES | `now()` |

### affirm_favs
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | text | text | NO | — |
| 4 | created_at | timestamptz | YES | `now()` |

### credit_costs
> 旧的固定价目表。现在是**兜底**：只有 `consume_credits` 没传 `p_points` 时才读它。
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | action | text | NO | — |
| 2 | cost | integer | NO | `0` |
| 3 | created_at | timestamptz | NO | `now()` |

### credit_ledger ★积分核心
> 余额 = `sum(amount)`（排除 `status='void'`）。不存"余额字段"。
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | action | text | NO | — |
| 4 | amount | integer | NO | — （扣款为负、发放/退款为正） |
| 5 | ledger_type | text | NO | — （`reward` / `consume` / `refund`，见约束） |
| 6 | created_at | timestamptz | NO | `now()` |
| 7 | ref | text | YES | — （幂等键；唯一索引 `(user_id, ref)`） |
| 8 | cost_usd | numeric | NO | `0` |

**已知约束**
- `credit_ledger_amount_nonzero`：`amount <> 0`
- `credit_ledger_type_valid`：`ledger_type in ('reward','consume','refund')`
- 唯一索引 `credit_ledger_ref_uniq (user_id, ref)`
- RLS 开启，策略 `credit_ledger_select_own`（只能看自己的）

**⏳ 待应用（迁移 `20260929000000_ledger_single_row.sql` 会新增 2 列）**
| 列 | 类型 | 可空 | 默认 | 说明 |
|---|---|---|---|---|
| `status` | text | NO | `'settled'` | `pending` / `settled` / `void` |
| `estimated_points` | integer | YES | — | 预扣时的预估积分（审计用） |

> 截至快照时这两列**尚未存在于线上**（已用 PostgREST 探测确认）。

### goals
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | title | text | NO | — |
| 4 | details | text | YES | `''` |
| 5 | target_date | date | YES | — |
| 6 | status | text | YES | `'active'` |
| 7 | created_at | timestamptz | YES | `now()` |

### listening_sessions
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | scenario | text | YES | `''` |
| 4 | frequency | text | YES | `''` |
| 5 | voice | text | YES | `''` |
| 6 | duration_sec | integer | YES | `0` |
| 7 | created_at | timestamptz | YES | `now()` |
| 8 | action | text | NO | `'generate'` |

### profiles ★账户/订阅
> `plan` 是**手动补的列**（原迁移没建），`plan='pro'` + `plan_expires_at IS NULL` = 永久 Pro。
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | uuid | NO | — （= `auth.users.id`，没有 `user_id` 列） |
| 2 | name | text | YES | `''` |
| 3 | area | text | YES | `''` |
| 4 | desire | text | YES | `''` |
| 5 | created_at | timestamptz | YES | `now()` |
| 6 | updated_at | timestamptz | YES | `now()` |
| 7 | email | text | YES | `''` |
| 8 | plan_expires_at | timestamptz | YES | — |
| 9 | plan | text | NO | `'free'` |

### saved_items
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | item_type | text | NO | — |
| 4 | ref_id | bigint | YES | — |
| 5 | created_at | timestamptz | YES | `now()` |

### saved_voices
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | title | text | NO | `''` |
| 4 | story | text | NO | `''` |
| 5 | affirmation | text | NO | `''` |
| 6 | sensory_anchor | text | NO | `''` |
| 7 | voice | text | NO | `''` |
| 8 | mood | text | NO | `''` |
| 9 | storage_key | text | NO | — |
| 10 | duration_sec | integer | NO | `0` |
| 11 | created_at | timestamptz | NO | `now()` |

### subscriptions
> **遗留表**。当前代码不写它（Pro 状态只存 `profiles.plan`），业务上可以忽略。
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | plan | text | YES | `'free'` |
| 4 | status | text | YES | `'inactive'` |
| 5 | current_period_end | timestamptz | YES | — |
| 6 | created_at | timestamptz | YES | `now()` |

### visions
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | kind | text | NO | — |
| 4 | prompt | text | YES | `''` |
| 5 | status | text | YES | `'pending'` |
| 6 | image_url | text | YES | `''` |
| 7 | video_url | text | YES | `''` |
| 8 | aspect_ratio | text | YES | `''` |
| 9 | duration | integer | YES | `0` |
| 10 | created_at | timestamptz | YES | `now()` |

### wallpapers
| pos | 列 | 类型 | 可空 | 默认 |
|---|---|---|---|---|
| 1 | id | bigint | NO | — |
| 2 | user_id | uuid | NO | — |
| 3 | prompt | text | YES | `''` |
| 4 | style | text | YES | `''` |
| 5 | image_url | text | YES | `''` |
| 6 | created_at | timestamptz | YES | `now()` |

---

## 二、视图（1 个）

### profiles_overview
> 管理用的"人 + 余额"汇总视图。
| pos | 列 | 类型 | 可空 |
|---|---|---|---|
| 1 | id | uuid | YES |
| 2 | name | text | YES |
| 3 | area | text | YES |
| 4 | desire | text | YES |
| 5 | created_at | timestamptz | YES |
| 6 | updated_at | timestamptz | YES |
| 7 | email | text | YES |
| 8 | plan_expires_at | timestamptz | YES |
| 9 | credit_balance | bigint | YES |

**⚠️ 注意事项**
- 视图**没有 `plan` 列**（只有 `plan_expires_at`）。
- `credit_balance` 如果是视图内直接 `sum(credit_ledger.amount)` 算的，**必须补 `and status <> 'void'`**，否则"生成失败已作废"的消费仍会被算进余额。建议改用 `credit_balance(id)` 函数。

---

## 三、函数（9 个）

| 函数 | 参数 | 说明 |
|---|---|---|
| `admin_set_balance` | `p_email text, p_target integer` | 按邮箱直接把余额设为某值（管理用） |
| `consume_credits` | `p_user_id uuid, p_action text, p_ref text DEFAULT NULL, p_cost_usd numeric DEFAULT 0, p_points integer DEFAULT NULL` | 原子扣费；顾问锁 + 幂等 ref。截图里后半段被截断，按迁移定义应为上表 |
| `credit_balance` | `p_user_id uuid` | 返回余额 = `sum(amount)` |
| `grant_credits` | `p_user_id uuid, p_amount integer, p_reason text DEFAULT 'admin_grant', p_ref text DEFAULT NULL` | 发放积分（充值/补偿），幂等 |
| `handle_new_user` | — | 注册触发器函数（新用户初始化）。**注意**：若还挂着触发器会自动送积分 |
| `refund_credits` | `p_user_id uuid, p_ledger_id bigint` | 按扣费流水退款 |
| `set_plan` | `p_user_id uuid, p_plan text, p_days integer DEFAULT 30` | 开通/续期 Pro（写 `profiles.plan` / `plan_expires_at`） |
| `settle_credits` | `p_user_id uuid, p_ledger_id bigint, p_actual_points integer` | 用后按真实成本结算，只退不补 |
| `wallet_summary` | `p_user_id uuid` | 一次返回余额 + 订阅状态（含过期自动降级） |

**⚠️ 缺失**：函数列表里**没有 `redeem_code`**，但边缘函数 `handleCreditsAction` 会调它（`redeem` action）。所以**兑换码功能目前会报错**，要么补建这个函数，要么先隐藏入口。

---

## 四、和积分系统的关系（速查）

| 关注点 | 落在哪 |
|---|---|
| 余额 | `credit_ledger.amount` 求和（排除 `void`） |
| 扣费流水 | `credit_ledger`，幂等键 `ref = {user_id}:{action}:{opId}` |
| 订阅状态 | `profiles.plan` + `profiles.plan_expires_at`（`NULL` = 永久） |
| 兜底价目 | `credit_costs`（现行定价在边缘函数 `index.ts` 的 `COST_TABLE`） |
| 管理看板 | 视图 `profiles_overview` |
| 遗留 | 表 `subscriptions` 已不参与业务 |

---

## 五、RLS 与权限

### 5.1 迁移里明确写过的（只有 2 张表）
来源：`20260925223000_credit_system_b.sql`

| 表 | RLS | 策略 | 客户端写权限 |
|---|---|---|---|
| `credit_ledger` | 启用 | `credit_ledger_select_own` — FOR SELECT USING `auth.uid() = user_id` | 已 revoke `insert/update/delete/truncate/references/trigger` |
| `credit_costs` | 启用 | `read credit_costs` — FOR SELECT USING `true` | 已 revoke `insert/update/delete/truncate/references/trigger` |

积分相关函数也全部 `revoke ... from public, anon, authenticated` + `grant execute ... to service_role`
（`consume_credits` / `settle_credits` / `refund_credits` / `credit_balance` / `grant_credits` / `set_plan` / `wallet_summary`）。

### 5.2 anon（未登录）实测探测 — 2026-09-29

| 表 | HTTP | 返回 | 判读 |
|---|---|---|---|
| `active_days` `affirm_custom` `affirm_favs` `credit_ledger` `goals` `listening_sessions` `profiles` `saved_items` `saved_voices` `subscriptions` `visions` `wallpapers` | 200 | `[]` | anon **有** SELECT 授权，但返回 0 行 → RLS 生效，匿名读不到数据 |
| `profiles_overview` | 401 | `permission denied for view profiles_overview` | anon 连视图权限都没有（更严格） |

> **结论**：未发现"未登录即可读到数据"的泄露。
> **局限**：探测只能证明"匿名看不到"，**不能**证明策略的具体内容（比如是否只允许读自己那一行）。

### 5.3 完整策略清单（2026-09-29 实测 `pg_policies`）

| 表 | 策略名 | cmd | roles | USING | WITH CHECK |
|---|---|---|---|---|---|
| `active_days` | owner all active_days | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `affirm_custom` | owner all affirm_custom | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `affirm_favs` | owner all affirm_favs | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `credit_costs` | read credit_costs | SELECT | public | `true` | — |
| `credit_ledger` | credit_ledger_select_own | SELECT | public | `auth.uid() = user_id` | — |
| `credit_ledger` | own credit_ledger read | SELECT | public | `auth.uid() = user_id` | — |
| `goals` | owner all goals | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `listening_sessions` | owner all listening_sessions | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `profiles` | owner all profiles | ALL | public | `auth.uid() = id` | `auth.uid() = id` |
| `saved_items` | owner all saved_items | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `saved_voices` | own saved_voices | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `subscriptions` | owner all subscriptions | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `visions` | owner all visions | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `wallpapers` | owner all wallpapers | ALL | public | `auth.uid() = user_id` | `auth.uid() = user_id` |

### 5.4 ⚠️ 越权开 Pro 漏洞（已确认，修复迁移已写、待执行）

**证据（2026-09-29 实测 `role_table_grants`）**：`profiles` 上 `anon` 与 `authenticated` 都持有表级
`INSERT / SELECT / UPDATE / DELETE / TRUNCATE / REFERENCES / TRIGGER`。

**成因**：`profiles` 的策略是 `FOR ALL` + `auth.uid() = id`，意味着登录用户可以 **UPDATE 自己整行**——包括 `plan` 和 `plan_expires_at`。两者叠加，任何人只要调一次 REST API：

```
PATCH /rest/v1/profiles?id=eq.<自己的 uid>
{ "plan": "pro", "plan_expires_at": null }
```

就能**免费给自己开永久 Pro**。

**修复**：迁移 [`20260929010000_protect_plan_columns.sql`](20260929010000_protect_plan_columns.sql)

```sql
-- ⚠️ 必须先收【表级】，再按列授权。
-- 只写 revoke update (plan) 是无效的：PostgreSQL 中表级授权与列级授权相互独立，
-- 只要角色仍持有表级 UPDATE，它就能更新该表所有列。
revoke insert, update on public.profiles from anon, authenticated;

grant insert (id, name, area, desire)   on public.profiles to authenticated;
grant update (name, area, desire)       on public.profiles to authenticated;
```

前端只写 `id / name / area / desire`（见 `app.js` 的 `seedProfile`），所以按列授权即可满足 onboarding；
`plan` / `plan_expires_at` 只剩 `service_role`（边缘函数）能写。

**验证（预期 false / false / true）**：

```sql
select has_table_privilege ('authenticated', 'public.profiles', 'UPDATE');
select has_column_privilege('authenticated', 'public.profiles', 'plan', 'UPDATE');
select has_column_privilege('authenticated', 'public.profiles', 'name', 'UPDATE');
```

> 复盘：第一版只写了 `revoke update (plan, plan_expires_at)`，验证仍返回 `true`——就是踩了
> "列级 revoke 动不了表级授权"这个坑。

### 5.5 其他小问题

- `credit_ledger` 有**两条重复的 SELECT 策略**（`credit_ledger_select_own` 来自迁移，`own credit_ledger read` 是旧实现遗留），条件完全相同，冗余。可清理：
  `drop policy if exists "own credit_ledger read" on public.credit_ledger;`
- `credit_costs` 策略 `USING (true)` → **匿名也能读价目表**。属于设计如此（前端要展示价格），但要知道成本表对公网开放。
- `subscriptions` 是 `FOR ALL` 且没人再读它——用户可自行插假订阅行，目前无影响，但表本身已废弃。

---

## 六、维护约定

1. **改 schema 后更新本文件**（新列/删列/改默认值）。
2. 迁移文件写在 `supabase/migrations/`，命名 `YYYYMMDDHHMMSS_描述.sql`，保持幂等。
3. 已知待办（截至快照）：
   - **【安全】修 `profiles` 的 Pro 越权**：`revoke update (plan, plan_expires_at) on public.profiles from anon, authenticated;`（见 5.4）
   - 应用 `20260929000000_ledger_single_row.sql` → 给 `credit_ledger` 加 `status` / `estimated_points`
   - 清理 `credit_ledger` 重复的 SELECT 策略 `own credit_ledger read`（见 5.5）
   - 修正 `profiles_overview` 的余额口径（排除 `void`）
   - 补 `redeem_code` 函数（或隐藏兑换入口）
   - 处理 `handle_new_user` 的注册赠分触发器
   - `story` 使用的 `minimax/minimax-m3:free` 已下架，需换可用模型