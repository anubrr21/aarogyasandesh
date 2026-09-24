import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const doctorCache = new Map();

export async function resolveAttendingDoctor(patient) {
  const id = patient?.assignedDoctorId;
  if (!id) return null;
  if (doctorCache.has(id)) return doctorCache.get(id);
  try {
    const snap = await getDoc(doc(db, 'doctors', id));
    const data = snap.exists() ? snap.data() : null;
    doctorCache.set(id, data);
    return data;
  } catch {
    doctorCache.set(id, null);
    return null;
  }
}

export function doctorFields(doctor) {
  if (!doctor) return [];
  const qualification = [doctor.education, doctor.specialization].filter(Boolean).join(', ');
  return [
    { label: 'Attending Doctor', value: doctor.name ? (/^dr\.?\s/i.test(doctor.name) ? doctor.name : `Dr. ${doctor.name}`) : 'N/A' },
    { label: 'Department', value: doctor.department || 'N/A' },
    { label: 'Qualification', value: qualification || 'N/A' },
    { label: 'Experience', value: doctor.experience || 'N/A' },
  ];
}

export function openPrintWindow() {
  return window.open('', '_blank');
}

export function showPdfForPrint(pdfDoc, printWindow) {
  pdfDoc.autoPrint();
  const url = pdfDoc.output('bloburl');
  if (printWindow && !printWindow.closed) {
    printWindow.location.href = url;
  } else {
    window.open(url, '_blank');
  }
}
