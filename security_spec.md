# Security Specification: Community Asset Map
**Database ID:** `ai-studio-1c43f76e-bb76-4899-bc97-dac146f4bd79`
**Auditor / Admin Identity:** `vinayalakshmi1021@gmail.com`
**Target Collections:** `users`, `assets`, `communityNeeds`, `reports`, `favorites`, `notifications`, `moderationLogs`

---

## 1. Data Invariants & Access Control Policy

### 1.1 `users`
* **Read:**
  * Anyone (guest or authenticated) can read basic user profile information (to display submitter names, bios, public civic reputation).
* **Create:**
  * Authenticated user writing to their own document `/users/{userId}` where `request.auth.uid == userId`.
  * Invariant: Self-assigned role MUST be `'member'` or `'guest'`. Privileged roles (`'moderator'`, `'admin'`) cannot be self-assigned unless `request.auth.token.email == 'vinayalakshmi1021@gmail.com'`.
  * `accountStatus` must initialize to `'active'`.
* **Update:**
  * Self (`request.auth.uid == userId`): Can update `displayName`, `photoURL`, `bio`, `locality`, and `updatedAt`.
  * **CRITICAL INVARIANT:** Self cannot change `role` or `accountStatus` (`request.resource.data.role == resource.data.role` and `request.resource.data.accountStatus == resource.data.accountStatus`).
  * Admins (`isAdmin()`): Can update any field including `role` and `accountStatus`.
* **Delete:**
  * Only Admins (`isAdmin()`).

### 1.2 `assets`
* **Read:**
  * Public read (`if true`) for civic discovery.
* **Create:**
  * Authenticated user (`request.auth != null`).
  * Invariants:
    * `submittedBy == request.auth.uid`.
    * Non-privileged users (`!isModerator()`) MUST set `verificationStatus == 'pending'`.
    * Valid geographic bounds: `latitude` in `[-90, 90]` and `longitude` in `[-180, 180]`.
    * `name`, `categoryId`, `description`, `address`, `city` must be valid non-empty strings within bounded lengths.
    * `imageUrls` must be a list (max 5) of HTTPS strings from authorized domains.
* **Update:**
  * Moderator / Admin (`isModerator()`): Can update verification status, moderator notes, verifiedBy/verifiedAt timestamps, or edit facility information.
  * Submitter / Owner (`request.auth.uid == resource.data.submittedBy`):
    * Can only update if current status is `'pending'` or `'needs_correction'`.
    * CANNOT alter `verificationStatus` to `'verified'`.
    * CANNOT alter `submittedBy`.
* **Delete:**
  * Moderator or Admin only (`isModerator()`).

### 1.3 `communityNeeds`
* **Read:**
  * Public read (`if true`).
* **Create:**
  * Authenticated user (`request.auth != null`).
  * `submittedBy == request.auth.uid`.
  * Initial status must be `'submitted'`.
* **Update:**
  * Moderators can update status, description, locality, or resolution details.
  * Authenticated users can update ONLY the `upvotes` count and `upvotedBy` list (citizen voting).
* **Delete:**
  * Moderator or Original Author (`request.auth.uid == resource.data.submittedBy`).

### 1.4 `reports`
* **Read:**
  * Only Regional Moderators or Civic Admins (`isModerator()`). Regular citizens cannot snoop other citizens' filed reports.
* **Create:**
  * Authenticated user (`request.auth != null`).
  * `reportedBy == request.auth.uid`.
  * Initial status must be `'pending'`.
* **Update / Delete:**
  * Only Regional Moderators or Civic Admins (`isModerator()`).

### 1.5 `favorites`
* Document ID pattern: `{userId}_{assetId}` or randomized with `userId` field.
* **Read / List:**
  * Owner only (`request.auth.uid == resource.data.userId`).
* **Create / Delete:**
  * Owner only (`request.auth.uid == request.resource.data.userId` or `resource.data.userId`).
* No user may read, tamper with, or delete another user's saved favorites.

### 1.6 `notifications`
* **Read / List:**
  * Owner only (`request.auth.uid == resource.data.userId`).
* **Create:**
  * System or authenticated user triggering an event (or moderator dispatching alert).
* **Update (Mark as Read):**
  * Owner only (`request.auth.uid == resource.data.userId`), allowing update of `readAt`.
* **Delete:**
  * Owner only (`request.auth.uid == resource.data.userId`).

### 1.7 `moderationLogs`
* **Read:**
  * Civic Admin or Regional Moderator only (`isModerator()`).
* **Create:**
  * Moderator or Civic Admin (`isModerator()`) with `moderatorId == request.auth.uid`.
* **Update / Delete:**
  * STRICTLY FORBIDDEN (`false`). Tamper-proof immutable audit trail.

---

## 2. The "Dirty Dozen" Threat Payloads (Test Matrix)

| ID | Attack Vector / Scenario | Actor | Target Path | Payload / Action | Expected Result |
|---|---|---|---|---|---|
| **DD-01** | Privilege Escalation via User Role Self-Update | Regular Member | `/users/user_abc` | Update `{ "role": "admin" }` | **DENY (403)** |
| **DD-02** | Unauthorized Asset Approval | Regular Member | `/assets/asset_123` | Update `{ "verificationStatus": "verified" }` | **DENY (403)** |
| **DD-03** | Snooping Other Users' Favorites | Member 1 | `/favorites/user2_asset1` | Read doc belonging to `user2` | **DENY (403)** |
| **DD-04** | Reading Confidential Citizen Reports | Regular Member | `/reports/report_456` | Read report filed by another citizen | **DENY (403)** |
| **DD-05** | Unauthorized Modification of Another Citizen's Asset | Member 1 | `/assets/asset_by_member2` | Update description or address | **DENY (403)** |
| **DD-06** | Modifying Immutable Audit Logs | Any (including Admin) | `/moderationLogs/log_789` | Update `{ "reason": "erased trace" }` | **DENY (403)** |
| **DD-07** | Deleting Audit Logs | Any (including Admin) | `/moderationLogs/log_789` | Delete doc | **DENY (403)** |
| **DD-08** | Inaccurate Spoofed Coordinates | Member 1 | `/assets/asset_bad` | Create with `latitude: 999.0` | **DENY (403)** |
| **DD-09** | Unauthorized Image Upload Domain / Protocol | Member 1 | `/assets/asset_bad_img` | Create with `imageUrls: ["http://malicious.ru/script.js"]` | **DENY (403)** |
| **DD-10** | Tampering with Another Citizen's In-App Notifications | Member 1 | `/notifications/notif_user2` | Read or mark as read | **DENY (403)** |
| **DD-11** | Unauthenticated Asset Submission | Unauthenticated | `/assets/asset_anon` | Create new civic asset | **DENY (403)** |
| **DD-12** | Valid Submitter Self-Edit on Pending Asset | Asset Author | `/assets/my_pending_asset` | Update description while still pending | **ALLOW (200)** |

---

## 3. Trusted Backend Architecture for Privileged Operations
* Privileged administration functions (such as modifying roles, verifying/rejecting assets, reading audit logs) are restricted strictly to users with verified role `'admin'` or `'moderator'`, or the bootstrap admin `vinayalakshmi1021@gmail.com`.
* Client-side bypasses have been removed. Any role assignment must be validated in Firestore security rules against administrative privileges or conducted via trusted backend endpoints.
