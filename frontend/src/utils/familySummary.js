import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { callGemini } from './gemini';
import { fetchConditionInfo, fetchMedicineInfo } from './medicalReference';
import { searchMedicineReference } from '../data/medicineReference';
import { computeVitalsTrend, TREND_LABELS } from './vitalsTrend';
import { resolveAttendingDoctor } from './pdfContext';
import { buildTimetable } from './medicineTimetable';

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]).catch(() => null);

const trim = (text, max) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max).replace(/\s+\S*$/, '')}...` : clean;
};

const istDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

const cleanMedicineName = (name) => String(name || '').split('(')[0].trim();

function isRelevantCondition(reference, diagnosisText) {
  if (!reference?.title) return false;
  const text = String(diagnosisText || '').toLowerCase();
  return reference.title
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 4)
    .some((word) => text.includes(word));
}

function describeVitals(vitals) {
  return computeVitalsTrend(vitals || [])
    .filter((entry) => entry.hasData && entry.readingCount >= 2)
    .map((entry) => {
      const unit = (reading) => reading.unit || '';
      const label = TREND_LABELS[entry.trend]?.label || entry.trend;
      return `${entry.displayName}: ${entry.first.value}${unit(entry.first)} at the first reading, ${entry.last.value}${unit(entry.last)} at the last reading (${label}, ${entry.readingCount} readings)`;
    });
}

function testsAndProcedures(patient) {
  const items = patient?.billing?.items || [];
  const done = items
    .filter((item) => ['Diagnostic', 'Procedure'].includes(item.category))
    .map((item) => `${item.description} (${item.category.toLowerCase()})`);
  const reports = (patient?.reports || []).map((report) => {
    const date = report.uploadedAt ? ` on ${istDate(report.uploadedAt)}` : '';
    return `${report.type || 'medical'} report added to the record${date}`;
  });
  return [...done, ...reports];
}

async function gatherFacts({ dischargeSummary, patient }) {
  const summary = dischargeSummary || {};
  const medicines = (summary.medicines || []).slice(0, 8);
  const diagnosisText = [summary.diagnosis, ...(summary.diagnosisList || []).map((d) => d.diagnosis)].filter(Boolean).join('; ');
  const conditionTerm = summary.diagnosisList?.[0]?.diagnosis || summary.diagnosis;

  const [doctor, conditionRaw, medicineInfo] = await Promise.all([
    withTimeout(resolveAttendingDoctor(patient), 4000),
    withTimeout(fetchConditionInfo(conditionTerm), 7000),
    Promise.all(medicines.map((medicine) => withTimeout(fetchMedicineInfo(cleanMedicineName(medicine.name)), 7000))),
  ]);

  const condition = isRelevantCondition(conditionRaw, diagnosisText)
    ? { name: conditionRaw.title, plainLanguageReference: trim(conditionRaw.summary, 700), source: conditionRaw.source }
    : null;

  const timetable = buildTimetable(medicines);
  const balance = summary.balance || 0;

  return {
    patient: {
      ageYears: summary.age ?? patient?.age ?? null,
      gender: patient?.gender && patient.gender !== 'N/A' ? patient.gender : null,
      wardOrUnit: patient?.ward || null,
    },
    stay: {
      admitted: istDate(summary.admitDate),
      discharged: istDate(summary.dischargeDate),
      lengthOfStayDays: summary.lengthOfStay ?? null,
      attendingDoctor: doctor?.name ? { name: doctor.name, department: doctor.department || null } : null,
    },
    diagnosis: {
      recordedByDoctor: summary.diagnosis || null,
      list: (summary.diagnosisList || []).map((d) => ({ name: d.diagnosis, type: d.type || null, doctorsNote: d.explainer || null })),
      referenceInfo: condition,
    },
    testsAndProcedures: testsAndProcedures(patient),
    howVitalsChanged: describeVitals(summary.vitals || patient?.clinical?.vitals),
    medicines: medicines.map((medicine, index) => {
      const generic = searchMedicineReference(cleanMedicineName(medicine.name), 1)[0];
      const fda = medicineInfo[index];
      return {
        name: medicine.name,
        dose: medicine.dosage || null,
        howOften: medicine.frequency || null,
        howTaken: medicine.route || null,
        timesOfDay: Object.entries(timetable[index].slots).filter(([, on]) => on).map(([slot]) => slot),
        medicineClass: generic?.category || null,
        officialPurpose: fda?.purpose ? trim(fda.purpose, 160) : fda?.indications ? trim(fda.indications, 200) : null,
      };
    }),
    doctorNotesAtDischarge: summary.doctorNotes || null,
    dischargeInstructions: summary.instructions || null,
    followUpDate: istDate(summary.followUpDate),
    payments: summary.totalBill !== undefined && ((summary.totalBill || 0) > 0 || (summary.totalDeposits || 0) > 0)
      ? { totalBillRupees: summary.totalBill || 0, depositsPaidRupees: summary.totalDeposits || 0, refundDueRupees: balance > 0 ? balance : 0, balanceToPayRupees: balance < 0 ? -balance : 0 }
      : null,
  };
}

function buildPrompt(facts) {
  return `You are the patient-communication writer at a hospital in India. Write a warm, clear discharge explanation for the patient's family, as a caring nurse would explain it in person.

VOICE
- Speak to the family directly ("your family member", "you"). Kind, calm, human. Short sentences. No jargon; if a medical word is unavoidable, explain it in brackets.
- Be specific: use the real numbers, dates, medicine names, doses and timings in the facts. Say what improved and by how much when the facts show it.
- Never sound like a template and never say you are an AI.

STRICT ACCURACY RULES
- Use ONLY the facts below. Do not add any diagnosis, cause, medicine, dose, test, food or activity advice, or warning sign that is not in the facts.
- Repeat medicine names, doses and how often EXACTLY as given. Never suggest changing a dose.
- To explain the condition, you may use "referenceInfo.plainLanguageReference" (if present) rephrased simply. For "medicineClass" or "officialPurpose" (if present) you may say what kind of medicine it is or what it is generally used for, phrased carefully ("usually used for..."). If neither is present, do not guess what a medicine is for.
- If the doctor's notes or instructions mention it, include it. If a topic has no information at all, leave that whole section out (do not write filler).
- Do not include the patient's name or contact details.

SECTIONS (in this order; skip a section only if it has no facts)
1. Your Family Member's Stay - why they were admitted, how long, the ward, the treating doctor and department.
2. Tests & Treatment - tests, scans, procedures and reports from the facts.
3. How Things Changed - the vitals that improved or stayed abnormal (with the first and last numbers) and what the doctor's notes say about recovery.
4. Medicines - one line per medicine: "Name - dose - how often - how it is taken" then, when known, what kind of medicine it is or what it is usually for. Mention the times of day.
5. Care at Home - only what the instructions or notes say.
6. Follow-up & Warning Signs - follow-up date, and exactly what to watch for and when to return, per the instructions.
7. Payments - a one or two line summary of the bill, deposits and refund or balance.

FORMAT
Return ONLY valid JSON with exactly two string keys, "english" and "hindi". No markdown, no code fences.
Each value is the full text: every section starts with its heading alone on its own line, followed by its text, and sections are separated by one blank line.
English headings exactly: Your Family Member's Stay / Tests & Treatment / How Things Changed / Medicines / Care at Home / Follow-up & Warning Signs / Payments
Hindi headings exactly: भर्ती के दौरान / जाँच और इलाज / स्थिति में बदलाव / दवाइयाँ / घर पर देखभाल / फॉलो-अप और खतरे के संकेत / भुगतान
The Hindi must be natural, simple spoken Hindi in Devanagari (not a word-for-word translation). Keep medicine names and doses as given, but translate timings and routes ("twice daily" -> "दिन में दो बार", "Oral" -> "मुँह से", "morning/afternoon/night" -> "सुबह/दोपहर/रात"). Write rupee amounts as "Rs. 1,200". Keep dates readable (for example 7 अक्टूबर 2026).

FACTS (JSON):
${JSON.stringify(facts, null, 2)}`;
}

function parseResponse(text) {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (typeof parsed.english !== 'string' || typeof parsed.hindi !== 'string') return null;
    return { english: parsed.english.trim(), hindi: parsed.hindi.trim() };
  } catch {
    return null;
  }
}

export async function generateFamilySummary({ dischargeSummary, patient }) {
  const facts = await gatherFacts({ dischargeSummary, patient });
  const prompt = buildPrompt(facts);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await callGemini(prompt);
    const parsed = parseResponse(text);
    if (parsed && parsed.english && parsed.hindi) return parsed;
  }
  return null;
}

export async function saveFamilySummary(patientDocId, { english, hindi }, approver) {
  await updateDoc(doc(db, 'patients', patientDocId), {
    'discharge.familySummary': {
      english,
      hindi,
      source: 'Drafted from hospital records, reviewed by the hospital team',
      approvedBy: approver.email || 'unknown',
      approvedByRole: approver.role || 'staff',
      approvedAt: new Date().toISOString(),
    },
  });
}

export async function removeFamilySummary(patientDocId) {
  await updateDoc(doc(db, 'patients', patientDocId), { 'discharge.familySummary': deleteField() });
}

export function splitSections(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [first, ...rest] = block.split('\n');
      return rest.length ? { title: first.replace(/[:：]\s*$/, '').trim(), body: rest.join('\n').trim() } : { title: '', body: first.trim() };
    });
}
