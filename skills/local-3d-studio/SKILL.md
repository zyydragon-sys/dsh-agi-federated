---
name: local-3d-studio
description: Three.js 本地 3D 场景、模型修改、离线预览和多视角截图的视觉工作流；不用于制造或工程干涉验收。
whenToUse: 当任务涉及 Three.js、程序化 3D、场景预览、模型视觉修改或渲染截图时。
---

# Local 3D Studio

## Scope

This is a visual 3D workflow. It is not a substitute for CAD, manufacturing tolerances, or engineering simulation.

## Workflow

1. Define the scene: camera, lighting, materials, scale, and target aspect ratios.
2. Build or modify the model with Three.js primitives or approved assets.
3. Render a preview and capture at least three viewpoints.
4. Inspect silhouette, scale, materials, clipping, and lighting.
5. Iterate on the scene; keep the camera and seed parameters.
6. Export preview images and, if requested, a self-contained viewer.

## Verification

- Multiple viewpoints show a coherent model and lighting.
- The scene loads offline without missing assets.
- Screenshot dimensions and camera framing match the brief.
- Visual acceptance is based on images and motion, not manufacturing tolerances.

## Hard limits

- Do not use this skill for production CAD, tolerances, or interference checks.
- Do not run untrusted Blender or Three.js setup scripts.
- Do not mix this skill's acceptance criteria with mechanical CAD.
