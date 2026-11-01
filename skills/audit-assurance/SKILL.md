---
name: audit-assurance
description: 会计、审计、财报分析、关联方核查、报告勾稽与法规检索；算术必须由代码完成，结论必须附带来源。
whenToUse: 当任务涉及财务报表、审计程序、勾稽检查、关联方、会计准则判断或法规检索时。
---

# Audit & Assurance

## Scope

Use for accounting analysis, audit support, financial statement review, related-party checks, and standards research. This skill does not replace a licensed auditor or legal opinion.

## Workflow

1. Fix the reporting framework, period, currency, and materiality before reading numbers.
2. Collect source documents: trial balance, statements, notes, contracts, prior-period reports.
3. Extract figures into a structured table; keep source file and row references.
4. Do all arithmetic in code (Python, pandas, openpyxl, or an Office formula engine). Never rely on mental arithmetic.
5. Cross-foot statements, reconcile subtotals, check cash-flow articulation, and compare note disclosures to primary statements.
6. For related parties, build an entity/transaction matrix and verify against disclosures.
7. For standards questions, cite the exact standard, paragraph, and effective date; distinguish mandatory requirements from interpretation.
8. Produce an evidence table: source, formula, result, exception, reviewer.

## Verification

- Recompute every material number independently.
- Run a deliberately broken sample and confirm the code detects the error.
- State assumptions and unresolved exceptions explicitly.
- Do not issue an audit opinion, legal conclusion, or investment recommendation without qualified human review.

## Hard limits

- No model-only arithmetic.
- No unsourced standards citation.
- No claim that a document is compliant just because a checklist was filled.
