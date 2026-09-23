export const SITE_KNOWLEDGE = `
FAMILY PORTAL — TABS AND WHERE TO FIND THINGS:

1. Overview tab — Patient ID, ABHA ID, phone, ward, bed, room, diagnosis, and recent activity feed.

2. Timeline tab — Full chronological history of everything staff has recorded: admission, diagnoses, medicines, vitals, notes, bills, discharge.

3. Clinical tab — Diagnosis list, prescribed medicines, vitals history, and the Consent section where family responds to consent requests (Approve/Reject) using an OTP shown on screen.

4. Billing tab — Cost Ledger (all bill items with amounts) and Deposits (all deposit requests), plus running Total Bill, Total Deposits, and Balance.

5. Bill Check tab — AI Bill Anomaly Detector: compares billed items against CGHS government benchmark rates, flags overcharges, includes manual search and upload/scan of a bill photo.

6. Hospital Info tab — Assigned doctor's details, list of all doctors with availability, ward visiting hours, and a "Get Visiting Pass" button that generates a QR code pass valid only during active visiting hours.

7. Insurance tab — Full insurance dashboard with four sub-tabs: Policies (add/view policies), Claims (view claim status), AI Assistant (insurance-specific AI help), and Hospital Directory:
   - Hospital Directory sub-tab — search India's National Hospital Directory (30,000+ hospitals, National Health Portal, updated monthly) by state/district — live data with hospital name, address, phone, specialties, bed count, and empanelment/collaboration info (e.g. PM-JAY, CGHS) where a hospital has reported it, plus a Google Maps link.
   - Same sub-tab also shows a "PM-JAY (Ayushman Bharat) Empanelment" table — live state/UT-wise count of hospitals empanelled under Ayushman Bharat PM-JAY and operational Ayushman Arogya Mandirs, sourced from a Rajya Sabha government answer via data.gov.in.
   - All of this is general public directory/government data, not specific to this patient's own policy — always confirm empanelment/cashless eligibility directly with the hospital and insurer/TPA.

8. Discharge tab — Discharge checklist progress, estimated discharge time and countdown, and (after discharge) the final bill summary.

9. Reports tab — View uploaded reports and prescriptions. Two buttons here:
   - "Upload Prescription" — family can upload their own prescription/therapy/diet documents (JPEG/PNG/PDF, max 10MB)
   - "Send Note to Staff" — family can type a free-text note that goes directly to hospital staff and appears in their notifications

10. Diagnosis Info tab — General reference information about the patient's recorded diagnoses and medicines, pulled live from independent public medical sources (never hardcoded, always fetched fresh):
   - MedlinePlus (U.S. National Library of Medicine) — plain-language explanation of each recorded diagnosis, with a link to the original MedlinePlus page.
   - WHO ICD-11 — official World Health Organization disease classification code and definition for each diagnosis, with a link to the official ICD-11 browser page.
   - openFDA (U.S. FDA) — for each medicine: purpose, what it's used for, typical dosage info, and warnings, with a link to the official DailyMed label page.
   - "India Health Context" section — national-level WHO statistics for India (life expectancy, Universal Health Coverage Index, out-of-pocket health spending %, air pollution exposure), each linking to the official WHO Global Health Observatory page.
   - A Status pipeline (Awaiting Diagnosis → Diagnosis Confirmed → Prescribed) derived automatically from whether diagnoses/medicines have been recorded.
   - This tab is clearly labeled as general educational information only — it never validates or confirms the patient's specific diagnosis or treatment; the doctor's own diagnosis recorded in the Clinical tab is the actual medical record.
   - Also reachable via a dedicated shortcut button in the top header, next to the language toggle.

11. India Open Data tab — Live public datasets from the Government of India's Open Data Platform (data.gov.in), general national/state-level context (not specific to this patient or hospital):
   - Real-Time Air Quality — live pollutant readings from CPCB (Central Pollution Control Board) monitoring stations across India.
   - Blood Supply — state/UT-wise blood units collected and issued (2018-2022), sourced from e-RaktKosh.
   - Health Infrastructure — state/UT-wise count of Sub-Centres, PHCs and CHCs, from Rural Health Statistics (National Health Mission).
   - Also reachable via a dedicated shortcut button in the top header, next to the Diagnosis Info button.

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
- "What does my diagnosis mean?" / "Tell me about this medicine" → Diagnosis Info tab (also see PUBLIC MEDICAL REFERENCE section below if present in this context)
- "What's the air quality like?" / "Is there a blood bank shortage?" / "How many health centres are in my state?" → India Open Data tab
- "Which hospitals are empanelled under Ayushman Bharat/PM-JAY?" / "Find a hospital in my state" / "Is this hospital covered by my insurance scheme?" → Insurance tab → Hospital Directory sub-tab
CONSENT SECURITY (HASH CHAIN):
- Every consent action (request, approval, rejection, expiry) is cryptographically linked using a SHA-256 hash chain — each new consent event stores a hash of the previous event plus its own data.
- If anyone tries to alter, delete, or backdate a past consent record, the chain breaks and tampering is immediately detectable using the "Verify Chain Integrity" button in the Clinical tab's Consent Ledger section.
- Consent events are also written to a separate append-only log that cannot be edited or deleted through the app, providing tamper-resistance beyond OTP verification and the visible Timeline.
- This means consent history is not just logged — it is verifiably immutable at the application level, in addition to the real-time OTP verification and Timeline audit trail already in place.
`
