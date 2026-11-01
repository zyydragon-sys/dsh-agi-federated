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
