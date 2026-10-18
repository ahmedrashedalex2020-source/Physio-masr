# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Path & Document ID Integrity**: Every document in `/sessions/{sessionId}`, `/clients/{clientId}`, and `/sync_meta/{metaId}` must have a valid alphanumeric/hyphen/underscore ID (`^[a-zA-Z0-9_\-]+$`, max 128 chars) that matches its internal `id` field (`incoming().id == sessionId`).
2. **Strict Schema Enforcement (Anti-Shadow-Field)**: No document in `sessions`, `clients`, or `sync_meta` can be created or updated with arbitrary or unapproved keys. All keys must strictly match `hasAll` and `hasOnly` constraints from `firebase-blueprint.json`.
3. **Volumetric & Boundary Constraints**: Every string field must have an explicit `.size()` upper bound, and numeric fields (`basePrice`, `totalPrice`, `totalSessions`) must be bounded (`>= 0 && <= 1000000`).
4. **Immutable Creation Identity**: Once a session is created, its `id` and `createdAt` fields cannot be altered during updates (`incoming().id == existing().id && incoming().createdAt == existing().createdAt`).

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on Create**: `{ id: "sess-1", ..., isAdmin: true }` -> Rejected by `keys().hasOnly(...)`.
2. **ID Mismatch Poisoning**: Creating `/sessions/sess-1` with `{ id: "sess-2", ... }` -> Rejected by `incoming().id == sessionId`.
3. **Oversized ID DoW Attack**: Document ID > 128 chars or containing invalid characters -> Rejected by `isValidId()`.
4. **Oversized Notes Payload**: `notes` string of 50,000 characters -> Rejected by `data.notes.size() <= 1000`.
5. **Invalid Payment Status Enum**: `paymentStatus: "free"` -> Rejected by `data.paymentStatus in ['pending', 'paid', 'cancelled']`.
6. **Invalid Payment Method Enum**: `paymentMethod: "crypto"` -> Rejected by `data.paymentMethod in ['cash', 'bank_transfer', 'credit_card']`.
7. **Negative Session Price**: `totalPrice: -500` -> Rejected by `data.totalPrice >= 0`.
8. **Type Confusion on Update**: Updating `clientName` to a number `12345` -> Rejected by `isValidSession(incoming())`.
9. **Immutable `createdAt` Tampering**: Changing `createdAt` during an update -> Rejected by `incoming().createdAt == existing().createdAt`.
10. **Shadow Key on Partial Update**: Adding `hacked: "yes"` during an update -> Rejected by `affectedKeys().hasOnly(...)` and `isValidSession(incoming())`.
11. **Client Profile Missing Required Key**: Creating `/clients/cli-1` without `primaryCondition` -> Rejected by `keys().hasAll(...)`.
12. **Unmapped Collection Write**: Writing to `/arbitrary_collection/doc1` -> Rejected by global default-deny `match /{document=**} { allow read, write: if false; }`.
