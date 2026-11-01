---
name: cad-mechanical
description: SolidWorks / AutoCAD 机械制图与装配工作流；应用必须在运行，写操作串行，破坏性动作需确认，交付前做干涉检查。
whenToUse: 当任务涉及机械零件、装配、工程图、CAD 自动化或干涉检查时。
---

# CAD & Mechanical

## Preconditions

- The CAD application is already running under the same Windows user and integrity level as the agent.
- The active document and units are known.
- A backup or version-controlled copy exists before any write.

## Workflow

1. Inspect the model tree, units, constraints, and existing features read-only.
2. State the planned feature changes and their dependencies before writing.
3. Serialize write operations; never run parallel CAD writes.
4. Ask for explicit one-time confirmation before overwrite, delete, or batch operations.
5. Build or modify the part/assembly, then rebuild and check for suppressed or failed features.
6. Run interference detection on assemblies; record every collision.
7. Export drawings or STEP files only after the model passes checks.

## Verification

- Interference check passes with zero unintended collisions.
- Dimensions and mass properties are recomputed, not copied from memory.
- The saved file can be reopened and rebuilt without errors.
- The drawing views match the model revision.

## Hard limits

- Never claim a part is manufacturable from a rendering alone.
- Never silently overwrite an existing CAD file.
- Do not mix rendering/3D-art workflows with engineering CAD acceptance.
