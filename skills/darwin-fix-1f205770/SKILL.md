---
name: darwin-fix-1f205770
description: 规避已监测到的「工具错误簇：edit:FS_NOT_OBSERVED 累计失败 8 次」（dsh-darwin-sentinel 工单 tkt-415429e3abfd5e5a）
whenToUse: 当任务情境与下方症状匹配时
---

## 背景（来自 dsh-darwin-sentinel 工单 tkt-415429e3abfd5e5a）

- 症状：工具错误簇：edit:FS_NOT_OBSERVED 累计失败 8 次
- 累计 24 次，估计浪费 ~0 tokens

### 证据（最近样本）
- [session-1180fe10-20ad-49f7-a9c7-19c65bb0e8ed#2036] edit 失败 FS_NOT_OBSERVED
- [session-1180fe10-20ad-49f7-a9c7-19c65bb0e8ed#2038] edit 失败 FS_NOT_OBSERVED
- [session-1180fe10-20ad-49f7-a9c7-19c65bb0e8ed#2150] edit 失败 FS_NOT_OBSERVED
- [session-1180fe10-20ad-49f7-a9c7-19c65bb0e8ed#2152] edit 失败 FS_NOT_OBSERVED
- [session-1180fe10-20ad-49f7-a9c7-19c65bb0e8ed#2218] edit 失败 FS_NOT_OBSERVED

## 行为指引

1. 动手前先复述你将采取的规避步骤，确认与本技能一致；
2. 若上一次同类操作刚失败，先改变方法而不是原样重试；
3. 连续两次失败后停下来向用户说明，而不是继续消耗会话。

## 文件修改契约（涉及 edit/write 时必守）

- 修改已存在的文件一律 `read` 之后再 `edit`/`write`；
- 收到 `FS_STALE_VERSION` / `file changed since it was read` 时，重新 `read`，
  把改动 rebase 到最新内容上再写；**不要原样重试同一 payload**（do not retry blindly）。
- 收到 `FS_NOT_OBSERVED` 说明尚未读取该文件，先 `read`。
- 脚本只改派生副本（仓库镜像、版本号）；确需脚本改工作副本时：read → 脚本写 → 立刻 read → 再 edit。

## Verification

1. `node --check` 所有改过的 js；
2. 有自检脚本就跑（本仓库 `node scripts/selftest.mjs`）；
3. 插件改动后停用→启用一次，确认 `application: applied`；
4. 打一次关键 REST/工具调用确认 `ok=true`；
5. 写完以后 **read back**（回读）改动位置，确认落点正确再收尾。

---
_本技能由 dsh-darwin-forge@0.1.0 (template) 从会话证据模板生成，欢迎人工润色。_