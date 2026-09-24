import { auth } from '../firebase/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function getVerifyUrl({ kind, patientDocId, docRef }) {
  if (!patientDocId || !auth.currentUser) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`${API_URL}/api/documents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, patientDocId, docRef }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.success && data.id ? `${window.location.origin}/verify/${data.id}` : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
