export const VITALS_NORMAL_RANGES = {
  bp: {
    systolic: { min: 90, max: 140 },
    diastolic: { min: 60, max: 90 },
    displayName: 'Blood Pressure',
    unit: 'mmHg',
    format: (value) => value || '--'
  },
  pulse: {
    min: 60,
    max: 100,
    displayName: 'Pulse',
    unit: 'bpm',
    format: (value) => value ? `${value} bpm` : '--'
  },
  temperature: {
    min: 36.1,
    max: 37.2,
    displayName: 'Temperature',
    unit: '°C',
    format: (value) => value ? `${value}°C` : '--'
  },
  oxygenSaturation: {
    min: 95,
    max: 100,
    displayName: 'SpO2',
    unit: '%',
    format: (value) => value ? `${value}%` : '--'
  },
  respiratoryRate: {
    min: 12,
    max: 20,
    displayName: 'Respiratory Rate',
    unit: '/min',
    format: (value) => value ? `${value}/min` : '--'
  }
};

export const getVitalStatus = (key, value) => {
  if (!value) return { status: 'unknown', color: 'text-gray-400', bg: 'bg-gray-100', label: 'Not recorded' };
  
  const range = VITALS_NORMAL_RANGES[key];
  if (!range) return { status: 'unknown', color: 'text-gray-400', bg: 'bg-gray-100', label: 'Unknown' };

  const numValue = parseFloat(value);
  if (isNaN(numValue)) return { status: 'unknown', color: 'text-gray-400', bg: 'bg-gray-100', label: 'Invalid' };

  if (key === 'bp') {
    const parts = value.split('/');
    if (parts.length === 2) {
      const systolic = parseInt(parts[0]);
      const diastolic = parseInt(parts[1]);
      if (!isNaN(systolic) && !isNaN(diastolic)) {
        const sysNormal = systolic >= range.systolic.min && systolic <= range.systolic.max;
        const diaNormal = diastolic >= range.diastolic.min && diastolic <= range.diastolic.max;
        if (sysNormal && diaNormal) {
          return { status: 'normal', color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Normal', isAbnormal: false };
        }
        if (systolic > range.systolic.max || diastolic > range.diastolic.max) {
          return { status: 'high', color: 'text-red-600', bg: 'bg-red-50', label: 'High', isAbnormal: true };
        }
        if (systolic < range.systolic.min || diastolic < range.diastolic.min) {
          return { status: 'low', color: 'text-red-600', bg: 'bg-red-50', label: 'Low', isAbnormal: true };
        }
      }
    }
    return { status: 'unknown', color: 'text-gray-400', bg: 'bg-gray-100', label: 'Invalid format' };
  }

  if (numValue < range.min) {
    return { status: 'low', color: 'text-red-600', bg: 'bg-red-50', label: `Low (Normal: ${range.min}-${range.max} ${range.unit})`, isAbnormal: true };
  }
  if (numValue > range.max) {
    return { status: 'high', color: 'text-red-600', bg: 'bg-red-50', label: `High (Normal: ${range.min}-${range.max} ${range.unit})`, isAbnormal: true };
  }
  return { status: 'normal', color: 'text-emerald-600', bg: 'bg-emerald-50', label: `Normal (${range.min}-${range.max} ${range.unit})`, isAbnormal: false };
};

export const getVitalIcon = (key) => {
  const icons = {
    bp: '🩸',
    pulse: '❤️',
    temperature: '🌡️',
    oxygenSaturation: '💨',
    respiratoryRate: '🫁'
  };
  return icons[key] || '📊';
};