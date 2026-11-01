---
name: darwin-llm-retry-loop
description: 规避 llm 重试环：先分类（抖动/限流/请求问题）再动作，限流时换路由而不是硬顶，禁止靠调高重试上限解决问题。
whenToUse: 当同一回合内反复出现 llm/retry、或看到 429/额度不足/上下文超限导致的连续失败时。
---

## 背景（来自 dsh-darwin-sentinel 工单 tkt-768bb1042ee2b749）

- 症状：同一会话 10 分钟内出现 5 次 `llm/retry`，累计 10 次，估计浪费 ~4,625 tokens
- 性质：供应商侧请求重试（`@deepseek-ai/dsh-llm-retry` 的领域），不是工具执行失败

## 判断：先分清是哪一种重试

1. **瞬时抖动**（网络/5xx）：重试是对的，不需要改行为；
2. **限流/额度**（429、insufficient balance）：继续原样重试只会放大浪费，必须换路由或停下；
3. **请求本身有问题**（上下文超限、图片模态不支持）：重试永远失败，属于无效重试环。

## 行为指引

- 发现同一轮里连续出现 2 次以上 `llm/retry`，**先判断类别再动作**，不要原样继续发第 3 次；
- 判定为限流/额度：走 `quota-nexus` 的轮转换一家（`GET /api/rotation` 看当前路由与池子，必要时 `POST /api/rotation/step`），而不是在同一路由上硬顶；
- 判定为请求问题：缩上下文 / 去掉不支持的模态（图片）后再发；
- **不要加重试次数上限来"解决"问题**：上限调大只会让无效重试烧更多 token。

## 文件修改契约（涉及 edit/write 时必守）

- 修改已存在的文件一律 `read` 之后再 `edit`/`write`；
- 收到 `FS_STALE_VERSION` / `file changed since it was read` 时，重新 `read`，把改动 rebase 到最新内容上再写；**不要重试**同一 payload（do not retry blindly）；
- 收到 `FS_NOT_OBSERVED` 说明尚未读取该文件，先 `read`。

## Verification

1. `node --check` 改过的 js；
2. 跑 `node scripts/selftest.mjs`（16 条断言）；
3. 插件改动后停用→启用一次，确认 `application: applied`；
4. 打一次关键 REST（如 `GET /api/rotation`）确认 `ok=true`；
5. 收尾前 **read back**（回读）改动位置，确认落点正确。

## 可观测指标

- 修复后同一会话 10 分钟窗口内 `llm/retry` 应降到 1~2 次；
- `darwin_scan` 的 `retry-loop` 工单累计次数不再增长即为收敛。