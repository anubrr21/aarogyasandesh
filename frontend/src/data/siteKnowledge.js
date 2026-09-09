export const SITE_KNOWLEDGE = `
FAMILY PORTAL — TABS AND WHERE TO FIND THINGS:

1. Overview tab — Patient ID, ABHA ID, phone, ward, bed, room, diagnosis, and recent activity feed.

2. Timeline tab — Full chronological history of everything staff has recorded: admission, diagnoses, medicines, vitals, notes, bills, discharge.

3. Clinical tab — Diagnosis list, prescribed medicines, vitals history, and the Consent section where family responds to consent requests (Approve/Reject) using an OTP shown on screen.

4. Billing tab — Cost Ledger (all bill items with amounts) and Deposits (all deposit requests), plus running Total Bill, Total Deposits, and Balance.

5. Bill Check tab — AI Bill Anomaly Detector: compares billed items against CGHS government benchmark rates, flags overcharges, includes manual search and upload/scan of a bill photo.

6. Hospital Info tab — Assigned doctor's details, list of all doctors with availability, ward visiting hours, and a "Get Visiting Pass" button that generates a QR code pass valid only during active visiting hours.

7. Insurance tab — Full insurance dashboard: add policy, view claims, create new claims, AI insurance assistant.

8. Discharge tab — Discharge checklist progress, estimated discharge time and countdown, and (after discharge) the final bill summary.

9. Reports tab — View uploaded reports and prescriptions. Two buttons here:
   - "Upload Prescription" — family can upload their own prescription/therapy/diet documents (JPEG/PNG/PDF, max 10MB)
   - "Send Note to Staff" — family can type a free-text note that goes directly to hospital staff and appears in their notifications

OTHER FEATURES:
- Notification bell (top right) — shows real-time alerts for new bills, reports, prescriptions, consent requests, and discharge.
- Language toggle (top right) — switches the whole portal and this chatbot between English and Hindi.
- Visiting Pass — generated from the Hospital Info tab; shows a QR code that hospital staff scan at the gate to verify entry.

COMMON QUESTIONS AND EXACT ANSWERS:
- "Where do I send a note to staff?" → Reports tab → "Send Note to Staff" button
- "Where can I see my bill?" → Billing tab for itemized bill, or Overview tab for a quick total
- "Where do I upload a prescription?" → Reports tab → "Upload Prescription" button
- "How do I check if I'm being overcharged?" → Bill Check tab
- "Where do I get a visiting pass?" → Hospital Info tab → "Get Visiting Pass" button
- "Where do I approve a consent request?" → Clinical tab, under Consent Requests — click Respond and enter the OTP shown
- "How do I see visiting hours?" → Hospital Info tab
- "Where is my insurance info?" → Insurance tab
CONSENT SECURITY (HASH CHAIN):
- Every consent action (request, approval, rejection, expiry) is cryptographically linked using a SHA-256 hash chain — each new consent event stores a hash of the previous event plus its own data.
- If anyone tries to alter, delete, or backdate a past consent record, the chain breaks and tampering is immediately detectable using the "Verify Chain Integrity" button in the Clinical tab's Consent Ledger section.
- Consent events are also written to a separate append-only log that cannot be edited or deleted through the app, providing tamper-resistance beyond OTP verification and the visible Timeline.
- This means consent history is not just logged — it is verifiably immutable at the application level, in addition to the real-time OTP verification and Timeline audit trail already in place.
`
