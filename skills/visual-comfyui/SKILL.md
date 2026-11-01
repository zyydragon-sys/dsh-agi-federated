---
name: visual-comfyui
description: 本地 ComfyUI 的角色一致性生成、评审、修正与多尺寸导出闭环；单次出图不算验收。
whenToUse: 当任务涉及 ComfyUI 绘图、角色卡、LoRA、风格控制或多轮视觉迭代时。
---

# Visual / ComfyUI

## Preconditions

- A local ComfyUI server is running and reachable.
- The base model, LoRA, sampler, seed, and workflow version are recorded.
- The user has rights to the reference images and style assets.

## Workflow

1. Write a shot brief: subject, style, composition, palette, aspect ratios, and rejection criteria.
2. Build a reusable workflow with explicit model/LoRA/seed controls.
3. Generate a contact sheet across seeds; select the best candidate against the brief.
4. Review for anatomy, text, hands, consistency, and unwanted artifacts.
5. Correct with targeted inpainting or prompt/workflow changes; keep the seed history.
6. Export the approved image at the requested sizes.
7. For recurring characters, compare face/clothing/proportion consistency across rounds.

## Verification

- The final image matches the brief and survives a second review pass.
- Character consistency is checked across at least two independent generations.
- Export dimensions and color profile are correct.
- No single-shot output is accepted as the final deliverable.

## Hard limits

- Do not execute unreviewed custom nodes or setup scripts.
- Do not claim a model or LoRA is installed without checking the local server.
- Do not use images the user lacks rights to.
