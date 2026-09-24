import { useState } from 'react';
import { FileText, Pill, Activity, CreditCard, StickyNote, ClipboardList, CalendarClock, Download, Printer, Sparkles } from 'lucide-react';
import VitalsTrendSummary from './VitalsTrendSummary';
import { MedicineTimetableView, VitalsCharts } from '../common/MiniCharts';
import { downloadDischargeSummaryPDF, printDischargeSummaryPDF } from '../../utils/generateDischargeSummaryPDF';

const Section = ({ icon: Icon, title, children }) => (
  <div className="border-t border-gray-200/50 pt-4">
    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-forest-700" />
      {title}
    </h4>
    {children}
  </div>
);

const FamilySummaryBlock = ({ familySummary }) => {
  const [language, setLanguage] = useState('english');
  return (
    <Section icon={Sparkles} title="In Simple Words">
      <div className="flex gap-2 mb-2">
        {[['english', 'English'], ['hindi', 'हिन्दी']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setLanguage(key)}
            className={`px-3 py-1 rounded-lg text-xs border transition-colors ${language === key ? 'bg-forest-600 text-white border-forest-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-line bg-white/70 border border-gray-200/60 rounded-lg p-3">{familySummary[language]}</p>
      <p className="text-[11px] text-gray-400 mt-1.5">Drafted from your hospital records and reviewed by the hospital team. It does not replace medical advice from your doctor.</p>
    </Section>
  );
};

const DischargeSummaryView = ({ dischargeSummary, patient, showActions = true, className = '' }) => {
  if (!dischargeSummary) {
    return <p className="text-sm text-gray-500">No discharge summary available yet.</p>;
  }

  const {
    patientName, age, diagnosis, admitDate, dischargeDate, lengthOfStay,
    diagnosisList = [], medicines = [], vitals = [],
    totalBill, totalDeposits, balance,
    doctorNotes, instructions, followUpDate,
  } = dischargeSummary;

  return (
    <div className={`space-y-5 ${className}`}>
      {showActions && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => downloadDischargeSummaryPDF({ patient, dischargeSummary, vitals })}
            className="px-3 py-1.5 bg-forest-50 text-forest-700 rounded-lg text-sm border border-forest-200 hover:bg-forest-100 transition-colors flex items-center gap-1.5"
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={() => printDischargeSummaryPDF({ patient, dischargeSummary, vitals })}
            className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm border border-gray-200 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Patient Name</p>
          <p className="text-gray-900 font-medium">{patientName || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-500">Age</p>
          <p className="text-gray-900 font-medium">{age ? `${age} years` : 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-500">Admit Date</p>
          <p className="text-gray-900 font-medium">{admitDate ? new Date(admitDate).toLocaleDateString('en-IN') : 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-500">Discharge Date</p>
          <p className="text-gray-900 font-medium">{dischargeDate ? new Date(dischargeDate).toLocaleDateString('en-IN') : 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-500">Length of Stay</p>
          <p className="text-gray-900 font-medium">{lengthOfStay ?? 'N/A'} day(s)</p>
        </div>
        <div>
          <p className="text-gray-500">Diagnosis</p>
          <p className="text-gray-900 font-medium">{diagnosis || 'N/A'}</p>
        </div>
      </div>

      {diagnosisList.length > 0 && (
        <Section icon={FileText} title="Diagnoses">
          <div className="space-y-1.5">
            {diagnosisList.map((d, i) => (
              <div key={i} className="text-sm bg-gray-50/70 border border-gray-200/50 rounded-lg px-3 py-1.5">
                <span className="font-medium text-gray-900">{d.diagnosis}</span>
                {d.type && <span className="text-xs text-gray-400 ml-2">({d.type})</span>}
                {d.explainer && <p className="text-xs text-gray-500 mt-0.5">{d.explainer}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {medicines.length > 0 && (
        <Section icon={Pill} title="Discharge Medications">
          <div className="space-y-1.5">
            {medicines.map((m, i) => (
              <div key={i} className="text-sm bg-gray-50/70 border border-gray-200/50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                <span className="text-gray-900">{m.name}</span>
                <span className="text-xs text-gray-500">{m.dosage} · {m.frequency} · {m.route}</span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold tracking-wider text-gray-500 mb-2">MEDICINE TIMETABLE</p>
            <MedicineTimetableView medicines={medicines} />
          </div>
        </Section>
      )}

      {vitals.length > 0 && (
        <Section icon={Activity} title="Vitals Trend">
          <VitalsTrendSummary vitals={vitals} />
          <div className="mt-3">
            <VitalsCharts vitals={vitals} />
          </div>
        </Section>
      )}

      {totalBill !== undefined && (
        <Section icon={CreditCard} title="Billing Summary">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Total Bill</p>
              <p className="text-gray-900 font-medium">₹{(totalBill || 0).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Deposits</p>
              <p className="text-gray-900 font-medium">₹{(totalDeposits || 0).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">{balance >= 0 ? 'Refund Due' : 'Balance Due'}</p>
              <p className={`font-semibold ${balance >= 0 ? 'text-forest-700' : 'text-red-600'}`}>₹{Math.abs(balance || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </Section>
      )}

      {doctorNotes && (
        <Section icon={StickyNote} title="Doctor's Notes">
          <p className="text-sm text-gray-700 whitespace-pre-line">{doctorNotes}</p>
        </Section>
      )}

      {instructions && (
        <Section icon={ClipboardList} title="Discharge Instructions">
          <p className="text-sm text-gray-700 whitespace-pre-line">{instructions}</p>
        </Section>
      )}

      {patient?.discharge?.familySummary?.english && (
        <FamilySummaryBlock familySummary={patient.discharge.familySummary} />
      )}

      {followUpDate && (
        <Section icon={CalendarClock} title="Follow-up Appointment">
          <p className="text-sm text-forest-700 font-medium">
            {new Date(followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </Section>
      )}
    </div>
  );
};

export default DischargeSummaryView;
