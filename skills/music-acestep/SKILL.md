---
name: music-acestep
description: 本地 ACE-Step 音乐的草稿、段落调整、局部重生成与混音导出循环；一次生成不算验收。
whenToUse: 当任务涉及 ACE-Step、音乐草稿、编曲段落、局部重生成或音频导出时。
---

# Music / ACE-Step

## Preconditions

- A local ACE-Step 1.5 API server is running and reachable.
- The project records tempo, key, duration, model version, and seed.
- The script path is known; do not call undocumented endpoints directly.

## Workflow

1. Write a brief: genre, tempo, key, instrumentation, structure, and reference feel.
2. Generate a short draft; keep the seed and prompt.
3. Review structure, timing, and mix; identify the exact section to change.
4. Regenerate only the target section with a controlled seed or prompt change.
5. Compare versions; keep the approved stem and reject the rest.
6. Mix and export to the requested format; verify loudness and duration.

## Verification

- The result has a reproducible prompt/seed and a clear version history.
- Local regeneration changes only the intended section.
- The exported audio opens and matches the requested duration and format.
- A single one-shot generation is not accepted as final.

## Hard limits

- Do not call the API directly when the provided script exists.
- Do not claim audio quality without listening or waveform checks.
- Do not use copyrighted references without rights.
