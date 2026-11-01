---
name: video-remotion
description: Remotion 编程式视频的多阶段制作与质量门；脚本、素材、渲染和导出都必须可复现。
whenToUse: 当任务涉及 Remotion、React 视频、分镜、字幕、渲染或视频交付时。
---

# Video / Remotion

## Workflow

1. Write a treatment: audience, duration, aspect ratio, frame rate, and delivery format.
2. Break into a shot list with timing, assets, text, transitions, and audio cues.
3. Build a minimal Remotion composition; keep assets and fonts versioned.
4. Render a low-resolution preview and inspect pacing, safe areas, and legibility.
5. Fix issues, then render the final resolution.
6. Run automated checks: duration, black frames, missing assets, audio sync, and file size.
7. Export a review copy and the final master separately.

## Quality gates

- Gate 1: script and shot list approved.
- Gate 2: preview passes timing and legibility.
- Gate 3: final render passes asset/audio/duration checks.
- Gate 4: delivery format and naming match the brief.

## Hard limits

- Do not run untrusted npm lifecycle scripts from a video package.
- Do not claim a render succeeded without checking the output file.
- Do not deliver a single-stage render that skipped the quality gates.
