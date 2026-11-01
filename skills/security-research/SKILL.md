---
name: security-research
description: 仅限已授权、隔离环境中的逆向工程与安全研究；必须保留范围、证据链和可复核 PoC。
whenToUse: 当任务涉及授权渗透测试、逆向分析、漏洞验证或安全研究报告时。
---

# Security Research

## Preconditions

- Written authorization identifies the target, time window, scope, and allowed techniques.
- Testing runs in an isolated environment or an explicitly approved lab.
- No production data, third-party systems, or out-of-scope targets are touched.

## Workflow

1. Restate the authorization and scope; stop if any target is ambiguous.
2. Establish a baseline and capture timestamps, tool versions, and environment details.
3. Use the least intrusive technique that answers the question.
4. Record every action and result in an evidence log.
5. For a finding, produce a minimal reproducible PoC, impact statement, and remediation advice.
6. Verify the PoC on a clean snapshot; do not rely on a single run.
7. Report responsibly; do not publish exploit details beyond the authorized channel.

## Verification

- Every finding has a reproducible PoC and an evidence trail.
- Scope compliance is checked before and after testing.
- No credential, token, or personal data is retained beyond the engagement.
- A reviewer can reproduce the result from the report.

## Hard limits

- No testing without explicit authorization.
- No destructive payloads, persistence, or lateral movement outside scope.
- No use against real third-party services or users.
- No operational exploit instructions in a general-purpose skill.
