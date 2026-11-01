---
name: defense-rag
description: 防务技术资料的受控检索增强；只做有来源、有配置修订号的检索，禁止凭记忆回答参数。
whenToUse: 当问题涉及防务、装备参数或受控技术资料，且用户提供了脱敏文档库时。
---

# Defense RAG

## Scope

This is a retrieval-only skill. It does not provide weapons design, operational employment, or manufacturing instructions. It answers only from the user's controlled, sanitized document set.

## Workflow

1. Confirm the document root, access classification, and allowed query scope.
2. Retrieve passages with document ID, page/section, revision, and effective date.
3. Answer only what the retrieved passages support.
4. Attach the source identifier and applicable configuration revision to every parameter-bearing statement.
5. If sources conflict, present both and mark the conflict; do not choose silently.
6. If no source is retrieved, answer: "当前文档库没有可引用来源，不能给出参数。"

## Verification

- Every numeric or configuration claim maps to a retrieved passage.
- Revision and applicability are stated, not implied.
- No answer is generated from model memory alone.
- A reviewer can reopen the cited document and find the passage.

## Hard limits

- No unsourced parameter answers.
- No operational weapon design, targeting, or employment guidance.
- No handling of classified material in an unapproved environment.
