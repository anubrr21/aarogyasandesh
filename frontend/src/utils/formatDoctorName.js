export function formatDoctorName(name) {
  const trimmed = (name || 'Doctor').trim();
  return /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}
