# Security Specification for Mistake Printer App

## Data Invariants
- A mistake record must belong to a legitimate user (`userId`).
- A mistake record must have exactly 3 variations generated.
- Timestamps must be validated against `request.time`.
- Document IDs must be valid strings.

## The "Dirty Dozen" Payloads

1. **Identity Theft (Write someone else's mistake)**: Try to create a mistake with `userId` of another user.
2. **Field Injection (Shadow field)**: Try to inject a `is_admin: true` field into the mistake document.
3. **Identity Spoofing (Update owner)**: Try to change the `userId` of an existing mistake record.
4. **Knowledge Point Poisoning**: Try to inject a 1MB string into the `knowledgePoint` field.
5. **Variation Count Bypass**: Try to save a mistake with 0 or 10 variations instead of 3.
6. **Time Travel**: Try to set a `createdAt` in the past or future manually.
7. **Orphaned Writes**: Try to create a variation without a parent mistake (not applicable here as Variations are nested).
8. **PII Leak (Unauthorized List)**: Try to list all mistakes without a `userId` filter.
9. **ID Poisoning**: Try to use a 1.5KB string as a document ID.
10. **Empty Payload**: Try to create a mistake with missing required fields like `originalText`.
11. **Type Mismatch**: Try to set `variations` as a string instead of an array.
12. **Malicious Regex**: Try to use document IDs with special characters to break path logic.

## Security Rules Strategy
- Use a `isValidMistake` helper.
- Use `request.auth.uid` comparison for all operations.
- Explicit `allow list` checking `resource.data.userId`.
- No blanket reads.
- Immutable `userId` and `createdAt`.

## Test Plan
I will generate `firestore.rules` and verify against these logic gaps.
