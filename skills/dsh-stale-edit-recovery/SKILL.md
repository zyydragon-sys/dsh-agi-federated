---
name: dsh-stale-edit-recovery
description: 当 edit/write 返回 FS_STALE_VERSION 或 file changed since read 时，重新读取文件、保留并发修改并 rebase 后重试，避免盲目重试和覆盖。
whenToUse: 当文件编辑因 stale version 或 file changed since read 失败时。
---

# Stale Edit Recovery

## When to use

Use this skill whenever `edit`, `write`, or any file mutation reports
`FS_STALE_VERSION`, `FS_NOT_OBSERVED`, or "file changed since it was read".

## Recovery protocol

1. Stop. Do not retry the same `old_string`; the file on disk has moved.
2. Re-read the target file with the `read` tool. For a large file, read the relevant range first.
3. Compare the current content with your intended change. Preserve the concurrent change instead of reverting it.
4. Rebase the edit:
   - If the intended line still exists, replace it in the current content.
   - If it was renamed or moved, update the anchor and apply the smallest safe change.
   - Use `write` only after a full read confirms the complete current content.
5. Retry exactly once with the refreshed content.
6. If it still fails, stop and report:
   - the path,
   - the stale error,
   - the current content or diff you observed,
   - the edit you intended.

## Prohibited

- No blind retry of an old edit after a stale result.
- No overwrite based on a stale full-file snapshot.
- No repeated retry loop; one rebase attempt, then report.
- No claiming success without a read-back of the final file.

## Verification

After a successful retry, read the file back and verify:

- the intended change is present,
- the concurrent change is preserved,
- no unrelated lines were removed.

## Evidence

Validated in this session with the real DSH file tools:

```text
read v1
external write v2
edit with v1 old_string -> FS_STALE_VERSION
read v2
edit rebased on v2 -> success
read-back -> BETA-rebased present, external change preserved
```
