# 0016. Defer QQ Mail and 163 Mail delivery tests to visitor login

- **Status**: Accepted
- **Date**: 2026-11-14
- **Requirements**: FR-AUTH-01, NFR-CN-04
- **Supersedes**: ADR-0004's "QQ Mail and 163 Mail delivery tests block release" timing only

## Context

ADR-0004 blocks release on login-code delivery to QQ Mail and 163 Mail. In v1 only the pre-provisioned owner address receives a code, and that address is a Gmail mailbox. Testing the other providers on production means rotating the `OWNER_EMAIL` secret and reseeding the owner twice.

## Decision

v1 requires verified delivery to the owner mailbox only. The QQ Mail and 163 Mail delivery tests block the release that opens login to visitors. SPF, DKIM, and DMARC remain v1 requirements under NFR-CN-04.

## Trade-offs

- **Gain**: No owner rotation on production for a path no v1 user takes.
- **Accept**: Delivery to mainland mailbox providers stays unverified until visitor login. A failure found then may require a sending-domain or provider change.
- **Reversal**: Low — run the two tests at any time.
