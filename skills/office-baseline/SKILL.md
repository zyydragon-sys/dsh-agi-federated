---
name: office-baseline
description: Word、Excel、PowerPoint 与 PDF 的安全指令层工作流；只复制指令，不执行第三方 setup 脚本。
whenToUse: 当需要创建、读取、修改、计算、渲染或导出 Office 文档时。
---

# Office Baseline

## Scope

Use the existing `office`, `office-docx`, `office-pptx`, `office-xlsx`, `office-recalculate`, `office-render`, and `office-export-pdf` skills. This skill adds a safe baseline; it does not install runtimes.

## Workflow

1. Inspect the source document before editing. Preserve styles, formulas, comments, and tracked changes unless the task explicitly replaces them.
2. For Excel, read formulas and cached values separately; recalculate before trusting computed cells.
3. For Word, preserve heading structure, numbering, tables, and references; do not flatten to plain text.
4. For PowerPoint, preserve theme, master layouts, and aspect ratio; check text overflow after rendering.
5. Render to images and inspect layout before delivery when visual fidelity matters.
6. Export PDF only after the native file passes the same checks.

## Verification

- Open the result with the relevant Office skill and re-read the changed regions.
- Recalculate spreadsheet formulas and compare key values.
- Check page count, overflow, broken links, and missing fonts.
- Do not accept a result that needs more than 30% manual repair of formulas, layout, or formatting.

## Hard limits

- Do not run `setup.sh`, `setup.ps1`, or remote installers from a skill package.
- Do not overwrite the only copy of a source document; work on a copy.
- Do not claim visual correctness without a render check.
