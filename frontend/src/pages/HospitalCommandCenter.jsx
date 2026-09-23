import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { usePatients } from '../context/PatientContext';
import { db } from '../firebase/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getVitalStatus } from '../utils/vitalsUtils';
import { checkAnomaly } from '../utils/billAnomaly';
import {
  ArrowLeft,
  Activity,
  Wind,
  BedDouble,
  TrendingUp,
  Settings2,
  Save,
  AlertTriangle,
  HeartPulse,
  Clock,
  Wallet,
  Stethoscope,
  ShieldAlert,
  Flame,
  TrendingDown,
  FileWarning,
  Zap
} from 'lucide-react';

const CAPACITY_DOC_ID = () => localStorage.getItem('staffGroup') || 'default';

function formatDateKey(d) {
  return d.toISOString().split('T')[0];
}

function last7DayKeys() {
  const keys = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(formatDateKey(d));
  }
  return keys;
}

const HospitalCommandCenter = () => {
  const { user } = useAuth();
  const { patients, allPatients, loading } = usePatients();
  const navigate = useNavigate();

  const [capacities, setCapacities] = useState({});
  const [capacityDraft, setCapacityDraft] = useState({});
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [savingCapacity, setSavingCapacity] = useState(false);

  useEffect(() => {
    const ref = doc(db, 'hospitalConfig', CAPACITY_DOC_ID());
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCapacities(data.wardCapacities || {});
      } else {
        setCapacities({});
      }
    }, (error) => {
      console.error('Error loading ward capacities:', error);
    });
    return () => unsubscribe();
  }, []);

  const activePatients = useMemo(
    () => patients.filter(p => !p.discharged),
    [patients]
  );

  const wardCounts = useMemo(() => {
    const counts = {};
    activePatients.forEach(p => {
      const ward = (p.ward && p.ward.trim()) ? p.ward.trim() : 'Not Assigned';
      counts[ward] = (counts[ward] || 0) + 1;
    });
    return counts;
  }, [activePatients]);

  const ventilatorCount = useMemo(
    () => activePatients.filter(p => p.onVentilator).length,
    [activePatients]
  );
  const oxygenCount = useMemo(
    () => activePatients.filter(p => p.onOxygenSupport).length,
    [activePatients]
  );

  // Critical Patients Watchlist — reuses the same getVitalStatus() thresholds already used on the
  // Family/Staff/Doctor vitals views, so "abnormal" means exactly the same thing everywhere in the app.
  const criticalPatients = useMemo(() => {
    const list = [];
    activePatients.forEach(p => {
      const vitalsArr = p.clinical?.vitals || [];
      const latest = vitalsArr.length ? vitalsArr[vitalsArr.length - 1] : null;
      const reasons = [];

      if (latest) {
        if (getVitalStatus('bp', latest.bp).isAbnormal) reasons.push(`BP ${latest.bp}`);
        if (getVitalStatus('pulse', latest.pulse).isAbnormal) reasons.push(`Pulse ${latest.pulse}`);
        if (getVitalStatus('temperature', latest.temperature, latest.temperatureUnit).isAbnormal) {
          reasons.push(`Temp ${latest.temperature}${latest.temperatureUnit || '°C'}`);
        }
        if (getVitalStatus('oxygenSaturation', latest.oxygenSaturation).isAbnormal) {
          reasons.push(`SpO2 ${latest.oxygenSaturation}%`);
        }
        if (getVitalStatus('respiratoryRate', latest.respiratoryRate).isAbnormal) {
          reasons.push(`RR ${latest.respiratoryRate}/min`);
        }
      }

      if (p.onVentilator) reasons.push('On Ventilator');
      if (p.onOxygenSupport) reasons.push('On Oxygen');

      if (reasons.length > 0) {
        list.push({
          id: p.id,
          name: p.name,
          ward: p.ward || 'Not Assigned',
          bed: p.bed || '—',
          reasons
        });
      }
    });
    return list;
  }, [activePatients]);

  // Average Length of Stay — from real admitDate/dischargeDate pairs on discharged patients.
  const avgLengthOfStay = useMemo(() => {
    const discharged = (allPatients || []).filter(p => p.admitDate && p.dischargeDate);
    if (discharged.length === 0) return null;
    const totalDays = discharged.reduce((sum, p) => {
      const admit = new Date(p.admitDate);
      const dis = new Date(p.dischargeDate);
      const days = Math.max(0, (dis - admit) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    return totalDays / discharged.length;
  }, [allPatients]);

  // Total outstanding balance across currently active patients — real billing.items/deposits data,
  // each patient's own balance floored at 0 so one patient's overpayment can't mask another's debt.
  const totalOutstanding = useMemo(() => {
    return activePatients.reduce((sum, p) => {
      const items = p.billing?.items || [];
      const deposits = p.billing?.deposits || [];
      const billTotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
      const depositTotal = deposits.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
      return sum + Math.max(0, billTotal - depositTotal);
    }, 0);
  }, [activePatients]);

  // Top diagnoses currently being treated, grouped from each active patient's real diagnosis records.
  const topDiagnoses = useMemo(() => {
    const counts = {};
    activePatients.forEach(p => {
      (p.clinical?.diagnosis || []).forEach(d => {
        const label = (d.diagnosis || '').trim();
        if (!label) return;
        const key = label.toLowerCase();
        if (!counts[key]) counts[key] = { label, count: 0 };
        counts[key].count += 1;
      });
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [activePatients]);

  // Patient Acuity Ranking — a transparent, rule-based severity score (not a black-box model): each
  // abnormal vital (+1), ventilator (+2), oxygen support (+2). Every point is shown, not hidden.
  const acuityRanking = useMemo(() => {
    const scored = activePatients.map(p => {
      const vitalsArr = p.clinical?.vitals || [];
      const latest = vitalsArr.length ? vitalsArr[vitalsArr.length - 1] : null;
      let score = 0;
      const factors = [];
      if (p.onVentilator) { score += 2; factors.push('Ventilator (+2)'); }
      if (p.onOxygenSupport) { score += 2; factors.push('Oxygen (+2)'); }
      if (latest) {
        if (getVitalStatus('bp', latest.bp).isAbnormal) { score += 1; factors.push('BP abnormal (+1)'); }
        if (getVitalStatus('pulse', latest.pulse).isAbnormal) { score += 1; factors.push('Pulse abnormal (+1)'); }
        if (getVitalStatus('temperature', latest.temperature, latest.temperatureUnit).isAbnormal) { score += 1; factors.push('Temp abnormal (+1)'); }
        if (getVitalStatus('oxygenSaturation', latest.oxygenSaturation).isAbnormal) { score += 1; factors.push('SpO2 abnormal (+1)'); }
        if (getVitalStatus('respiratoryRate', latest.respiratoryRate).isAbnormal) { score += 1; factors.push('RR abnormal (+1)'); }
      }
      return { id: p.id, name: p.name, ward: p.ward || 'Not Assigned', bed: p.bed || '—', score, factors };
    });
    return scored.filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
  }, [activePatients]);

  // Vitals Deterioration Trend — compares each active patient's two most recent readings (real,
  // timestamped) to catch a worsening direction, not just a currently-abnormal snapshot.
  const deterioratingPatients = useMemo(() => {
    const list = [];
    activePatients.forEach(p => {
      const vitalsArr = (p.clinical?.vitals || [])
        .slice()
        .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
      if (vitalsArr.length < 2) return;
      const prev = vitalsArr[vitalsArr.length - 2];
      const curr = vitalsArr[vitalsArr.length - 1];
      const changes = [];

      const prevSpo2 = parseFloat(prev.oxygenSaturation), currSpo2 = parseFloat(curr.oxygenSaturation);
      if (!isNaN(prevSpo2) && !isNaN(currSpo2) && (prevSpo2 - currSpo2) >= 2) {
        changes.push(`SpO2 declining: ${prevSpo2}% → ${currSpo2}%`);
      }
      const prevPulse = parseFloat(prev.pulse), currPulse = parseFloat(curr.pulse);
      if (!isNaN(prevPulse) && !isNaN(currPulse) && (currPulse - prevPulse) >= 15) {
        changes.push(`Pulse rising: ${prevPulse} → ${currPulse} bpm`);
      }
      const prevTemp = parseFloat(prev.temperature), currTemp = parseFloat(curr.temperature);
      if (!isNaN(prevTemp) && !isNaN(currTemp) && (currTemp - prevTemp) >= 0.5) {
        changes.push(`Temperature rising: ${prevTemp}° → ${currTemp}°`);
      }
      const prevRR = parseFloat(prev.respiratoryRate), currRR = parseFloat(curr.respiratoryRate);
      if (!isNaN(prevRR) && !isNaN(currRR) && (currRR - prevRR) >= 4) {
        changes.push(`Respiratory rate rising: ${prevRR} → ${currRR}/min`);
      }

      if (changes.length > 0) {
        list.push({ id: p.id, name: p.name, ward: p.ward || 'Not Assigned', bed: p.bed || '—', changes });
      }
    });
    return list;
  }, [activePatients]);

  // Hospital-wide billing anomaly snapshot — reuses the exact same CGHS matching function that
  // already powers the per-bill Bill Check tab, just run in aggregate across every active patient.
  const billingAnomalySnapshot = useMemo(() => {
    let checked = 0, flagged = 0;
    const flaggedItems = [];
    activePatients.forEach(p => {
      (p.billing?.items || []).forEach(item => {
        if (!item.description || !item.amount) return;
        const result = checkAnomaly(item.description, parseFloat(item.amount));
        if (result.status === 'invalid' || result.status === 'unmatched') return;
        checked += 1;
        if (result.status === 'flagged') {
          flagged += 1;
          flaggedItems.push({
            patientName: p.name,
            description: item.description,
            amount: item.amount,
            diffPercent: result.diffPercent
          });
        }
      });
    });
    flaggedItems.sort((a, b) => b.diffPercent - a.diffPercent);
    return { checked, flagged, topFlagged: flaggedItems.slice(0, 5) };
  }, [activePatients]);

  // Live activity feed — merges real, already-timestamped events (admission, discharge, bill items,
  // consent decisions, vitals recordings) across every patient this staff member can see.
  const activityFeed = useMemo(() => {
    const events = [];
    (allPatients || []).forEach(p => {
      if (p.admitDate) {
        const t = new Date(p.admitDate).getTime();
        if (!isNaN(t)) events.push({ type: 'admit', time: t, text: `${p.name} admitted to ${p.ward || 'ward'}` });
      }
      if (p.dischargeDate) {
        const t = new Date(p.dischargeDate).getTime();
        if (!isNaN(t)) events.push({ type: 'discharge', time: t, text: `${p.name} discharged` });
      }
      (p.billing?.items || []).forEach(item => {
        if (item.addedAt) {
          const t = new Date(item.addedAt).getTime();
          if (!isNaN(t)) events.push({ type: 'bill', time: t, text: `Bill item "${item.description}" (₹${item.amount}) added for ${p.name}` });
        }
      });
      (p.clinical?.consentEvents || []).forEach(c => {
        if (c.respondedAt) {
          const t = new Date(c.respondedAt).getTime();
          if (!isNaN(t)) events.push({ type: 'consent', time: t, text: `${p.name}'s family ${c.status} a ${c.type} consent request` });
        }
      });
      (p.clinical?.vitals || []).forEach(v => {
        if (v.recordedAt) {
          const t = new Date(v.recordedAt).getTime();
          if (!isNaN(t)) events.push({ type: 'vitals', time: t, text: `Vitals recorded for ${p.name}` });
        }
      });
    });
    return events.sort((a, b) => b.time - a.time).slice(0, 12);
  }, [allPatients]);

  const trend = useMemo(() => {
    const dayKeys = last7DayKeys();
    const admissions = {};
    const discharges = {};
    dayKeys.forEach(k => { admissions[k] = 0; discharges[k] = 0; });

    (allPatients || []).forEach(p => {
      if (p.admitDate) {
        const key = String(p.admitDate).slice(0, 10);
        if (key in admissions) admissions[key] += 1;
      }
      if (p.dischargeDate) {
        const key = String(p.dischargeDate).slice(0, 10);
        if (key in discharges) discharges[key] += 1;
      }
    });

    const totalAdmissions = Object.values(admissions).reduce((a, b) => a + b, 0);
    const totalDischarges = Object.values(discharges).reduce((a, b) => a + b, 0);

    // Exclude today from the average since it's a partial day — avoids skewing the trend low.
    const pastDayKeys = dayKeys.slice(0, -1);
    const pastAdmissions = pastDayKeys.reduce((sum, k) => sum + admissions[k], 0);
    const pastDischarges = pastDayKeys.reduce((sum, k) => sum + discharges[k], 0);
    const avgDailyAdmissions = pastDayKeys.length ? pastAdmissions / pastDayKeys.length : 0;
    const avgDailyDischarges = pastDayKeys.length ? pastDischarges / pastDayKeys.length : 0;
    const netDailyChange = avgDailyAdmissions - avgDailyDischarges;

    const enoughData = (totalAdmissions + totalDischarges) >= 3;

    return {
      dayKeys, admissions, discharges,
      avgDailyAdmissions, avgDailyDischarges, netDailyChange, enoughData
    };
  }, [allPatients]);

  const currentOccupancy = activePatients.length;
  const projected24h = Math.max(0, Math.round(currentOccupancy + trend.netDailyChange));

  const startEditingCapacity = () => {
    const draft = {};
    Object.keys(wardCounts).forEach(w => { draft[w] = capacities[w] ?? ''; });
    Object.keys(capacities).forEach(w => { if (!(w in draft)) draft[w] = capacities[w]; });
    setCapacityDraft(draft);
    setEditingCapacity(true);
  };

  const saveCapacities = async () => {
    setSavingCapacity(true);
    try {
      const cleaned = {};
      Object.entries(capacityDraft).forEach(([ward, val]) => {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) cleaned[ward] = num;
      });
      await setDoc(doc(db, 'hospitalConfig', CAPACITY_DOC_ID()), {
        wardCapacities: cleaned,
        updatedBy: user?.uid || null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setEditingCapacity(false);
    } catch (error) {
      console.error('Error saving ward capacities:', error);
    } finally {
      setSavingCapacity(false);
    }
  };

  // Wards nearing capacity — only meaningful once staff has actually set a capacity for that ward.
  const nearCapacityWards = useMemo(() => {
    return Object.entries(wardCounts)
      .filter(([ward]) => capacities[ward])
      .map(([ward, count]) => ({
        ward, count, capacity: capacities[ward],
        pct: Math.round((count / capacities[ward]) * 100)
      }))
      .filter(w => w.pct >= 85)
      .sort((a, b) => b.pct - a.pct);
  }, [wardCounts, capacities]);

  const maxDayValue = Math.max(
    1,
    ...trend.dayKeys.map(k => Math.max(trend.admissions[k], trend.discharges[k]))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate('/staff')}
        className="flex items-center gap-2 text-gray-500 hover:text-forest-700 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-forest-50 rounded-xl border border-forest-200/50">
          <Activity className="w-5 h-5 text-forest-700" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900">Hospital Command Center</h1>
          <p className="text-sm text-gray-500">Live occupancy &amp; trends — every number below comes directly from real patient records</p>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Currently Occupied</p>
              <p className="text-2xl font-bold text-gray-900">{currentOccupancy}</p>
              <p className="text-xs text-gray-400 mt-1">Active (non-discharged) patients right now</p>
            </div>
            <div className="w-12 h-12 bg-forest-50 rounded-xl flex items-center justify-center border border-forest-100">
              <BedDouble className="w-6 h-6 text-forest-700" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">On Ventilator</p>
              <p className="text-2xl font-bold text-rose-600">{ventilatorCount}</p>
              <p className="text-xs text-gray-400 mt-1">Staff-recorded at admission</p>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100">
              <Activity className="w-6 h-6 text-rose-600" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">On Oxygen Support</p>
              <p className="text-2xl font-bold text-sky-600">{oxygenCount}</p>
              <p className="text-xs text-gray-400 mt-1">Staff-recorded at admission</p>
            </div>
            <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100">
              <Wind className="w-6 h-6 text-sky-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Ward-wise occupancy */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-forest-500" />
            Ward-wise Occupancy
          </h2>
          {!editingCapacity ? (
            <button
              onClick={startEditingCapacity}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-forest-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Set ward capacity
            </button>
          ) : (
            <button
              onClick={saveCapacities}
              disabled={savingCapacity}
              className="flex items-center gap-1.5 text-xs text-white bg-forest-700 hover:bg-forest-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {savingCapacity ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>

        {Object.keys(wardCounts).length === 0 ? (
          <p className="text-sm text-gray-400">No active patients right now.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(wardCounts).sort((a, b) => b[1] - a[1]).map(([ward, count]) => {
              const capacity = capacities[ward];
              const pct = capacity ? Math.min(100, Math.round((count / capacity) * 100)) : null;
              const barColor = pct === null ? 'bg-forest-400' : pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-forest-600';
              return (
                <div key={ward}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800">{ward}</span>
                    <span className="text-gray-500">
                      {editingCapacity ? (
                        <span className="flex items-center gap-1.5">
                          {count} /
                          <input
                            type="number"
                            min="0"
                            value={capacityDraft[ward] ?? ''}
                            onChange={(e) => setCapacityDraft({ ...capacityDraft, [ward]: e.target.value })}
                            placeholder="capacity"
                            className="w-20 px-2 py-0.5 border border-gray-200 rounded-lg text-xs"
                          />
                        </span>
                      ) : (
                        capacity ? `${count} / ${capacity} beds (${pct}%)` : `${count} patients (no capacity set)`
                      )}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                      style={{ width: pct !== null ? `${pct}%` : `${Math.min(100, count * 12)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7-day admissions/discharges trend */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-forest-500" />
          Admissions vs Discharges — Last 7 Days
        </h2>
        <div className="flex items-end justify-between gap-2 h-40 mb-2">
          {trend.dayKeys.map((key) => {
            const admH = (trend.admissions[key] / maxDayValue) * 100;
            const disH = (trend.discharges[key] / maxDayValue) * 100;
            const label = new Date(key).toLocaleDateString('en-US', { weekday: 'short' });
            return (
              <div key={key} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <div className="flex items-end gap-0.5 h-full w-full justify-center">
                  <div className="w-3 bg-forest-400 rounded-t" style={{ height: `${Math.max(admH, trend.admissions[key] > 0 ? 4 : 0)}%` }} title={`${trend.admissions[key]} admitted`} />
                  <div className="w-3 bg-orange-400 rounded-t" style={{ height: `${Math.max(disH, trend.discharges[key] > 0 ? 4 : 0)}%` }} title={`${trend.discharges[key]} discharged`} />
                </div>
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-forest-400 rounded-sm inline-block" /> Admissions</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange-400 rounded-sm inline-block" /> Discharges</span>
        </div>
      </div>

      {/* Honest projection */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-forest-500" />
          Projected Occupancy — Next 24 Hours
        </h2>
        {trend.enoughData ? (
          <>
            <p className="text-3xl font-bold text-gray-900 mb-1">{projected24h} <span className="text-base font-normal text-gray-400">patients</span></p>
            <p className="text-xs text-gray-500">
              Based on a {6}-day trailing average of {trend.avgDailyAdmissions.toFixed(1)} admissions/day and{' '}
              {trend.avgDailyDischarges.toFixed(1)} discharges/day, applied to the current occupancy of {currentOccupancy}.
            </p>
          </>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Not enough admission/discharge history yet for a reliable projection. This will become more accurate
              as more real patient records accumulate.
            </p>
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100">
          This is a transparent trend calculation on real timestamps — not a machine-learning forecast. We show the
          exact numbers behind it rather than a claim we can't back up.
        </p>
      </div>

      {nearCapacityWards.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <h2 className="font-semibold text-red-800 flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4" />
            Wards Near Capacity
          </h2>
          <div className="space-y-1">
            {nearCapacityWards.map(w => (
              <p key={w.ward} className="text-sm text-red-700">
                <span className="font-medium">{w.ward}</span> is at {w.pct}% capacity ({w.count}/{w.capacity} beds)
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Critical Patients Watchlist */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm mt-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <HeartPulse className="w-4 h-4 text-rose-500" />
          Critical Patients Watchlist
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Active patients whose latest recorded vitals are outside normal range, or who are on
          ventilator/oxygen support — using the same normal ranges as every vitals view in the app.
        </p>
        {criticalPatients.length === 0 ? (
          <p className="text-sm text-gray-400">No active patients currently flagged.</p>
        ) : (
          <div className="space-y-2">
            {criticalPatients.map(p => (
              <div key={p.id} className="p-3 bg-red-50/60 border border-red-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <span className="text-xs text-gray-500">{p.ward} · Bed {p.bed}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {p.reasons.map((r, i) => (
                    <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[11px]">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Key hospital KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Length of Stay</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgLengthOfStay !== null ? `${avgLengthOfStay.toFixed(1)} days` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {avgLengthOfStay !== null ? 'From real admit/discharge dates' : 'No discharges recorded yet'}
              </p>
            </div>
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center border border-violet-100">
              <Clock className="w-6 h-6 text-violet-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Outstanding Balance</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalOutstanding.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-400 mt-1">Across all active patients' real billing records</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
              <Wallet className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Top diagnoses */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm mt-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Stethoscope className="w-4 h-4 text-forest-500" />
          Top Diagnoses — Active Patients
        </h2>
        {topDiagnoses.length === 0 ? (
          <p className="text-sm text-gray-400">No diagnoses recorded for active patients yet.</p>
        ) : (
          <div className="space-y-3">
            {topDiagnoses.map((d) => {
              const maxCount = topDiagnoses[0].count;
              const pct = Math.max(8, Math.round((d.count / maxCount) * 100));
              return (
                <div key={d.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800 capitalize">{d.label}</span>
                    <span className="text-gray-500">{d.count} patient{d.count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-forest-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Patient Acuity Ranking */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm mt-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <Flame className="w-4 h-4 text-orange-500" />
          Patient Acuity Ranking
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          A transparent, rule-based severity score — not a black-box model. Every point shown here comes from a
          visible rule: +2 for ventilator, +2 for oxygen support, +1 per abnormal vital.
        </p>
        {acuityRanking.length === 0 ? (
          <p className="text-sm text-gray-400">No active patients currently score above zero.</p>
        ) : (
          <div className="space-y-2">
            {acuityRanking.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-orange-50/60 border border-orange-200 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {p.score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">#{i + 1} {p.name}</p>
                    <span className="text-xs text-gray-500">{p.ward} · Bed {p.bed}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{p.factors.join(' · ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vitals Deterioration Trend */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm mt-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-red-500" />
          Vitals Trending Worse
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Compares each patient's two most recent vitals readings — catches a worsening direction even if the
          latest single reading isn't flagged as abnormal yet.
        </p>
        {deterioratingPatients.length === 0 ? (
          <p className="text-sm text-gray-400">No active patient's vitals are trending worse right now.</p>
        ) : (
          <div className="space-y-2">
            {deterioratingPatients.map(p => (
              <div key={p.id} className="p-3 bg-red-50/60 border border-red-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <span className="text-xs text-gray-500">{p.ward} · Bed {p.bed}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {p.changes.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[11px]">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hospital-wide billing anomaly snapshot */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm mt-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <FileWarning className="w-4 h-4 text-amber-500" />
          Hospital-Wide Bill Anomaly Snapshot
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Runs the same CGHS-benchmark check used in the Bill Check tab across every active patient's bill items,
          all at once.
        </p>
        {billingAnomalySnapshot.checked === 0 ? (
          <p className="text-sm text-gray-400">No CGHS-matchable bill items recorded for active patients yet.</p>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-3">
              <span className="font-bold text-amber-600">{billingAnomalySnapshot.flagged}</span> of{' '}
              <span className="font-medium">{billingAnomalySnapshot.checked}</span> matched bill items currently flagged
              above CGHS benchmark rates.
            </p>
            {billingAnomalySnapshot.topFlagged.length > 0 && (
              <div className="space-y-1.5">
                {billingAnomalySnapshot.topFlagged.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-gray-700">{f.description} — {f.patientName}</span>
                    <span className="font-medium text-amber-700">+{f.diffPercent}% (₹{f.amount})</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Live activity feed */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm mt-6">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-forest-500" />
          Live Activity Feed
        </h2>
        {activityFeed.length === 0 ? (
          <p className="text-sm text-gray-400">No recorded activity yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {activityFeed.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-600 pb-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-400 whitespace-nowrap">{new Date(e.time).toLocaleString()}</span>
                <span>{e.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalCommandCenter;
