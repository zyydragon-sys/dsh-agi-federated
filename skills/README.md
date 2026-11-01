# skills/

项目级技能的**版本化副本**。真正被 DSH 热加载的活动挂载在
`<workspace>/.dsh/skills/<name>/SKILL.md`（工作区根目录下的 `.dsh`），
本目录是它的单向镜像，随仓库一起 review、发布与回滚。

## 同步

```bash
node scripts/skills-sync.mjs          # 挂载 → 仓库（补缺、覆盖变更）
node scripts/skills-sync.mjs --check  # 只校验；不一致退出码 1
node scripts/skills-sync.mjs --list   # JSON：added / changed / removed
```

方向固定为 **`.dsh/skills` → `skills/`**，脚本不会写回活动挂载。
仓库里多出、挂载里已不存在的文件只报告不删除（删除需要人确认）。

## 现有技能

| 技能 | 来源 | 内容 |
|---|---|---|
| `dsh-stale-edit-recovery` | 既有 | `FS_STALE_VERSION` 时重读、rebase、再写，避免盲重试 |
| `darwin-fix-1f205770` | darwin 工单 `tkt-415429e3abfd5e5a` | 规避 `edit:FS_NOT_OBSERVED` 簇：read → edit 契约与验证步骤 |
| `darwin-llm-retry-loop` | darwin 工单 `tkt-768bb1042ee2b749` | llm 重试环：先分类（抖动/限流/请求问题），限流时换路由而非硬顶 |

## 晋级链路（人工闸门）

```
darwin_scan → darwin_forge → darwin_eval（P2 门，≥80%）
            → darwin_promote { confirm: true }（写进 .dsh/skills）
            → darwin_rollback { skillName, confirm: true }（可回滚）
```

`darwin_harden_candidate` 用于在晋级前人工改写候选的 `skillName / description / body`。
CI 失败只会开出带 `darwin-ticket` 标签的 issue，**不会自动晋级任何技能**。
