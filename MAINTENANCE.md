# Maintenance and publication

## Source of truth

`D:\Deepseek工作区\dsh-agi-federated` is the source of truth. The GitHub
repository `zyydragon-sys/dsh-agi-federated` is a published mirror; the DSH
profile installs this directory through a `link:` dependency.

## Version policy

- **patch** — bug, security, or documentation fix (for example 1.0.1);
- **minor** — backward-compatible tool or behavior addition;
- **major** — breaking config, data, or tool contract change.

Update all of these together:

1. `package.json` `version`
2. `index.js` `PLUGIN_VERSION`
3. `ARCHITECTURE.md` and `README.md` version lines
4. `CHANGELOG.md`
5. the market submission archive and directory entry when they change

The nested `plugins/dsh-quota-nexus` bundle keeps its own version.

## Publish

Security default: **a temporary token per update**. Do not persist a PAT in the
user environment (`setx`), in a shell profile, or in the repository; the token
should exist only for the seconds it takes to publish.

```powershell
# Local plan, no network or token
node scripts/publish.mjs --all --dry-run

# Publish both bundles; the prompt masks input and the token never touches disk
node scripts/publish.mjs --all
#   (or explicitly: Read-Host "PAT" | node scripts/publish.mjs --all --token-stdin)

# Publish only the root AGI bundle
node scripts/publish.mjs --plugin dsh-agi-federated
```

Token sources, preferred first: `--token-stdin` (masked prompt / pipe),
`--token-file` (deleted after a successful run), `--token`, and only for CI
`GITHUB_TOKEN`/`GH_TOKEN`. Nothing logs the token and no code path writes it
back to disk.

## Monitor

```powershell
# Compare local files and package version with the published repository
node scripts/monitor.mjs
```

`scripts/watch.mjs` is a convenience watcher that keeps a token in a long-lived
process; it therefore violates the temporary-token default. Start it only when
you explicitly accept that tradeoff, and stop it afterwards.

## Release checklist

- [ ] `node --check index.js`
- [ ] `node --check schemas/config.js`
- [ ] `node scripts/publish.mjs --all --dry-run`
- [ ] `node scripts/monitor.mjs`
- [ ] publish, then run `node scripts/monitor.mjs` again
- [ ] verify the DSH profile bundle in `agi_status`

## 不崩盘铁律（硬约束）

1. **发布前必须过 `node scripts/preflight.mjs`**：语法 → 19 条自检 → 两个包的 apply 无头装配 →
   profile 清单校验 → 客户端 5 个槽位渲染。`publish.mjs` 已把它设为默认闸门，
   `--skip-preflight` 只在明确知情时使用。
2. **定时器/后台任务一律 `.catch()`**：未处理的 Promise 拒绝会让 Host 退出。
3. **插件在 Host 里绝不抛到 apply 外层**：所有外部服务访问走 `ctx.get?.()` + try/catch，缺失就降级。
4. **profile 清单由自愈守护**：`profiles/<profile>/package.json` 被改坏（BOM/乱码/丢 bundle/被截断）时，
   登录时启动项 + Host 内 `profileGuardCheck`（30s）会从 `package.json.golden` 恢复并留证。
5. **验收口径**：`build` 版本号 + `overview.ok` + `/api/profile-guard` 无 problems + 工具可调用，
   四者同时满足才算“没崩”。
