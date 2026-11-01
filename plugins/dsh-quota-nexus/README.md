# dsh-quota-nexus

**Version:** 1.9.0 · **Bundle:** `plugins/dsh-quota-nexus` in
[`zyydragon-sys/dsh-agi-federated`](https://github.com/zyydragon-sys/dsh-agi-federated)

多模型供应商额度池 + O(1) 租约调度 + 熔断恢复 + 0s 额度遥测。作为 DeepSeek Harness 的
Host 插件（bundle）运行，并在 **设置 → 额度中枢** 与 **左侧栏「额度中枢」图标** 里提供
卡片列表式供应商管理页。

## 文件

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半：凭据池、调度器、熔断、额度解析、Write-Behind 账本、REST/SSE、`quota_nexus_status` 工具 |
| `client.js` | Client 半：`settings.section` 注册的卡片列表 UI（状态点 / 编辑 / 删除 / “+ 添加模型提供商”） |
| `schemas/config.js` | schemastery `Config` + 防御式 `normalizeConfig()` |
| `cordis.patch.yml` | 插入 `dsh-quota-nexus` 行（`persistenceRoot: 'D:\DeepSeek Harness'`） |
| `locale/*.json` | 插件市场的显示标题与描述（en / zh） |
| `icon.svg` | 插件图标 |

## 安装

首选（同时完成包安装与 bundle 选择）：

```text
plugin_manager({ action: "install_bundle", target: "D:\\Deepseek工作区\\dsh-quota-nexus" })
```

也可以走 CLI 把包加入 profile（`dsh plugin` 把剩余参数原样转发给 profile 目录里的 pnpm）：

```powershell
dsh plugin --profile $env:DSH_PROFILE add "D:\Deepseek工作区\dsh-quota-nexus"
```

注意：CLI 的 `add` 只把包放进 profile 的 `node_modules`，**不负责 bundle 选择**；要让
`cordis.patch.yml` 参与装配，仍需 `plugin_manager install_bundle`（或等价的 bundle 启用步骤）。
两条命令重复执行是幂等的，不会产生两个插件行。

安装后确认：

```text
plugin_manager({ action: "list_plugins" })     # 看 enabled / fiberPhase
cordis_inspect_query({ platform: "host", provider: "Config", method: "listConfigs", input: { name: "dsh-quota-nexus" } })
```

若你的发行版带 `dsh` CLI，可用它核对 profile 的实际装配结果：

```powershell
dsh --profile $env:DSH_PROFILE --dump-config
```

启用/停用：`plugin_manager({ action: "set_plugin", target: "dsh-quota-nexus", enabled: true })`。
替换已安装的包需要重启 Host（新 JavaScript 模块代次），新增 bundle 可通过 HMR 激活。

## 数据与安全

- 持久化根目录固定为 `D:\DeepSeek Harness`，插件在其下建立独立子目录 `dsh-quota-nexus\`：
  `providers.json`（凭据）、`state.json`（健康/冷却/额度快照）、`usage-ledger.jsonl`（审计账本）、
  `alerts.json`（预警去重与收件箱）、`oauth-pending.json`（PKCE 待完成项）。
- 目录以 `0o700` 创建、文件以 `0o600` 原子写入（临时文件 + fsync + rename）。
- 根目录不可写时自动降级到 `%USERPROFILE%\.dsh-quota-nexus`，并在 `quota_nexus_status` 的
  `warnings` 里给出 `persistence_fallback` 诊断；不会静默丢数据。
- REST/SSE（`/quota-nexus/api/*`）只接受回环地址连接，只返回**掩码**密钥（形如 `sk-a…9f2c`），
  绝不返回完整密钥；领取租约（含鉴权头）只在进程内发生，不经过 HTTP。
- 日志与 UI 输出中的账号一律脱敏为 `vendorId#后 6 位`。
- 损坏的 JSON 会被隔离为 `*.corrupt-<ts>` 而不是被覆盖。

## 供应商协议

| 协议族 | `kind` | 鉴权头 | 内置供应商 |
|---|---|---|---|
| OpenAI 兼容 | `openai-compatible` | `authorization: Bearer <key>` | DeepSeek / OpenAI / MiniMax / Moonshot / 智谱 / 通义（兼容模式）/ OpenRouter / Ollama / `custom` |
| Anthropic Messages | `anthropic-messages` | `x-api-key` + `anthropic-version: 2023-06-01` | Anthropic 官方 / `custom-anthropic` |
| Gemini | `gemini` | `x-goog-api-key` | Google Gemini |

`custom-anthropic` 用于任意 Anthropic Messages 协议端点（官方直连或中转站）：**base_url 必填**，填到 `/v1` 为止——官方为 `https://api.anthropic.com/v1`，中转站填其对应的 `/v1` 根地址。设置页选中该供应商时会显示协议提示。

校验连通性时，`/models` 返回 404/405 会被判定为“可达但无探测接口”而不是失败，避免中转端点被误判；401/403 仍然判定为凭据拒绝。

## 风险披露（非官方通道）

本插件支持通过 **OpenAI 兼容协议** 接入任意第三方服务（`custom` 供应商），也支持配置
**OAuth2 PKCE** 通道与 **Webhook 预警**。这带来以下必须由你自行评估的风险：

1. **第三方端点**：`baseUrl` 由你填写。请求会带着你的 API Key 直连该地址；运营方可见你的
   提示词、响应与用量。只填写你信任的服务。
2. **非官方鉴权通道**：OAuth 使用你自行登记的 `client_id` / `redirect_uri`。授权页由第三方域名
   承载，插件不校验其页面内容；`state` 与 `code_verifier` 用于防 CSRF 与拦截，但不构成对第三方的信任背书。
3. **Webhook 外发**：预警会把账号掩码、额度百分比与冷却状态 POST 到你配置的 URL，等于把
   运维元数据交给该 URL 的所有者。
4. **本机凭据发现**：扫描只读取 `DEEPSEEK_API_KEY` 等环境变量与 `~/.codex/auth.json`、
   `~/.claude/.credentials.json`、`~/.gemini/oauth_creds.json` 等快照文件；**只列出候选、不自动导入**，
   导入必须由你显式点击。
5. **额度数据来源**：额度百分比只来自供应商真实返回的限流响应头（`x-ratelimit-*`、
   `anthropic-ratelimit-*`、`retry-after`）。供应商不返回这些头时，UI 显示“该账号尚未上报额度
   响应头”，**不会用硬编码账号或猜测值伪造可用额度**。

## 调度与可靠性要点

- 选号策略：`priority` / `round-robin` / `balanced`（最小堆取最久闲置）/ `sticky`（会话内固定）。
- 单次请求最多尝试 **8** 个不同账号；满载时最多排队 **100ms**，超时返回
  `quota_nexus_backpressure` 与退避建议，不阻塞主线程。
- 池为空返回 `quota_nexus_empty`；全不可用返回 `quota_nexus_unavailable` 且带逐个账号的
  排除原因（`quota_exhausted` / `cooldown_429` / `cooldown_5xx` / `needs_relogin` / `disabled` /
  `model_cooldown` / `storm_brake`）。
- 429 与 5xx 分开计数、按模型冷却、指数退避 + 全抖动；连续 3 次 401/403 触发凭据熔断
  （30 分钟，`needs_relogin`）。
- 消耗达 95% 提前切换、剩余低于 5% 预冷；预警阈值 80/90/95% 与余额下限，带去重与 Webhook。
- 冷却与租约剩余时间基于 `performance.now()` 单调时钟，系统时间跳变不影响倒计时。

## 在哪里看到它

- **左侧栏图标「额度中枢」**（`sidebar.panellist`，order 5）：点开即在内容列渲染主面板（`main` key = `quota-nexus`），实时显示提供商卡片、状态点、额度条、冷却倒计时与预警。
- **设置 → 额度中枢**：同一份视图的管理入口（`settings.section`）。
- **工具** `quota_nexus_status`（`section=overview|providers|quota|errors`）。
- **REST** `/quota-nexus/api/overview`；**SSE** `/quota-nexus/api/events`（快照 + 额度/健康/供应商/预警增量）。

## 排障

- `quota_nexus_status` 是只读工具，`section` 可选 `overview|providers|quota|errors`。
- 配置文件损坏 / 供应商不可达时该工具返回 `ok:false` + `warnings`，而不是抛错。
- 若显示 `web_server_unavailable`：该 profile 未启用 `webServer`，REST/SSE 面板不可用，但状态
  工具与调度逻辑仍然正常工作。
- 若 `schemastery unavailable`：`schemas/config.js` 进入纯 JS 归一化降级路径，设置页表单退化为
  YAML 文本编辑；功能不受影响。
