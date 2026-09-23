import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Pill, AlertTriangle, ExternalLink, CheckCircle, Loader2, Info, ClipboardList, Globe2 } from 'lucide-react';
import { fetchConditionInfo, fetchMedicineInfo, fetchIndiaHealthContext, fetchICD11Info } from '../../utils/medicalReference';

const DiagnosisContextPanel = ({ diagnoses, medicines }) => {
  const [conditionInfo, setConditionInfo] = useState({});
  const [medicineInfo, setMedicineInfo] = useState({});
  const [loadingConditions, setLoadingConditions] = useState({});
  const [loadingMedicines, setLoadingMedicines] = useState({});
  const [healthContext, setHealthContext] = useState(undefined);
  const [icdInfo, setIcdInfo] = useState({});
  const [loadingIcd, setLoadingIcd] = useState({});

  const uniqueDiagnoses = Array.from(new Set((diagnoses || []).map(d => d.diagnosis).filter(Boolean)));
  const uniqueMedicines = Array.from(new Set((medicines || []).map(m => m.name).filter(Boolean)));

  useEffect(() => {
    uniqueDiagnoses.forEach(async (name) => {
      if (conditionInfo[name] !== undefined || loadingConditions[name]) return;
      setLoadingConditions(prev => ({ ...prev, [name]: true }));
      const result = await fetchConditionInfo(name);
      setConditionInfo(prev => ({ ...prev, [name]: result }));
      setLoadingConditions(prev => ({ ...prev, [name]: false }));
    });
  }, [diagnoses]);

  useEffect(() => {
    uniqueDiagnoses.forEach(async (name) => {
      if (icdInfo[name] !== undefined || loadingIcd[name]) return;
      setLoadingIcd(prev => ({ ...prev, [name]: true }));
      const result = await fetchICD11Info(name);
      setIcdInfo(prev => ({ ...prev, [name]: result }));
      setLoadingIcd(prev => ({ ...prev, [name]: false }));
    });
  }, [diagnoses]);

  useEffect(() => {
    uniqueMedicines.forEach(async (name) => {
      if (medicineInfo[name] !== undefined || loadingMedicines[name]) return;
      setLoadingMedicines(prev => ({ ...prev, [name]: true }));
      const result = await fetchMedicineInfo(name);
      setMedicineInfo(prev => ({ ...prev, [name]: result }));
      setLoadingMedicines(prev => ({ ...prev, [name]: false }));
    });
  }, [medicines]);

  useEffect(() => {
    if (healthContext !== undefined) return;
    fetchIndiaHealthContext().then(setHealthContext);
  }, [healthContext]);

  const stage = uniqueMedicines.length > 0
    ? 'prescribed'
    : uniqueDiagnoses.length > 0
      ? 'confirmed'
      : 'awaiting';

  const stages = [
    { id: 'awaiting', label: 'Awaiting Diagnosis' },
    { id: 'confirmed', label: 'Diagnosis Confirmed' },
    { id: 'prescribed', label: 'Prescribed' }
  ];
  const stageIndex = stages.findIndex(s => s.id === stage);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Diagnosis Info</h3>
          <p className="text-sm text-gray-500">General reference information from independent public medical sources</p>
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          This tab shows general educational information pulled live from independent public medical references (MedlinePlus, U.S. FDA).
          It does not validate, confirm, or comment on your specific diagnosis or treatment — it is background reading only.
          Always consult your treating doctor for anything about your own care.
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-forest-700" />
          <h4 className="font-medium text-gray-900">Status</h4>
        </div>
        <div className="flex items-center">
          {stages.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i <= stageIndex ? 'bg-forest-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {i < stageIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] text-center max-w-[80px] ${i <= stageIndex ? 'text-forest-800 font-medium' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${i < stageIndex ? 'bg-forest-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-purple-500" />
          <h4 className="font-medium text-gray-900">Your Diagnoses</h4>
        </div>
        {uniqueDiagnoses.length === 0 ? (
          <p className="text-sm text-gray-500">No diagnosis recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {uniqueDiagnoses.map((name) => {
              const info = conditionInfo[name];
              const isLoading = loadingConditions[name];
              const detail = (diagnoses || []).find(d => d.diagnosis === name);
              const icd = icdInfo[name];
              const icdLoading = loadingIcd[name];
              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white/70 rounded-xl border border-gray-200/70"
                >
                  <p className="font-medium text-gray-900">{name}</p>
                  {detail?.explainer && (
                    <p className="text-sm text-gray-500 mt-0.5">{detail.explainer}</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {isLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Looking up general reference info…
                      </div>
                    )}
                    {!isLoading && info && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-forest-800 mb-1">
                          <Info className="w-3.5 h-3.5" />
                          {info.title}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {info.summary.length > 600 ? info.summary.slice(0, 600) + '…' : info.summary}
                        </p>
                        <a
                          href={info.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-forest-700 hover:text-forest-800 mt-2"
                        >
                          Source: {info.source} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {!isLoading && info === null && (
                      <p className="text-xs text-gray-400">No public reference entry found for this term.</p>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {icdLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Looking up WHO ICD-11 classification…
                      </div>
                    )}
                    {!icdLoading && icd && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 mb-1">
                          <Globe2 className="w-3.5 h-3.5" />
                          WHO ICD-11: {icd.title} {icd.code && <span className="text-gray-400 font-normal">({icd.code})</span>}
                        </div>
                        {icd.definition && (
                          <p className="text-sm text-gray-700 leading-relaxed">{icd.definition}</p>
                        )}
                        {icd.browserUrl && (
                          <a
                            href={icd.browserUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 mt-2"
                          >
                            Source: {icd.source} <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                    {!icdLoading && icd === null && (
                      <p className="text-xs text-gray-400">No WHO ICD-11 classification found for this term.</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Pill className="w-4 h-4 text-forest-600" />
          <h4 className="font-medium text-gray-900">Your Medicines</h4>
        </div>
        {uniqueMedicines.length === 0 ? (
          <p className="text-sm text-gray-500">No medicines prescribed yet.</p>
        ) : (
          <div className="space-y-4">
            {uniqueMedicines.map((name) => {
              const info = medicineInfo[name];
              const isLoading = loadingMedicines[name];
              const detail = (medicines || []).find(m => m.name === name);
              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white/70 rounded-xl border border-gray-200/70"
                >
                  <p className="font-medium text-gray-900">{name}</p>
                  {detail && (
                    <p className="text-sm text-gray-500 mt-0.5">{detail.dosage} • {detail.frequency} • {detail.route}</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {isLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Looking up FDA reference info…
                      </div>
                    )}
                    {!isLoading && info && (
                      <div className="space-y-2">
                        {(info.matchedGeneric || info.matchedBrand) && (
                          <p className="text-xs text-gray-400">Matched product: {info.matchedBrand || info.matchedGeneric}</p>
                        )}
                        {info.purpose && (
                          <p className="text-sm text-gray-700"><span className="font-medium text-gray-900">Purpose: </span>{info.purpose}</p>
                        )}
                        {info.indications && (
                          <p className="text-sm text-gray-700"><span className="font-medium text-gray-900">Used for: </span>{info.indications.length > 300 ? info.indications.slice(0, 300) + '…' : info.indications}</p>
                        )}
                        {info.dosage && (
                          <p className="text-sm text-gray-700"><span className="font-medium text-gray-900">Typical dosage info: </span>{info.dosage.length > 300 ? info.dosage.slice(0, 300) + '…' : info.dosage}</p>
                        )}
                        {info.warnings && (
                          <p className="text-sm text-red-600"><span className="font-medium">Warnings: </span>{info.warnings.length > 300 ? info.warnings.slice(0, 300) + '…' : info.warnings}</p>
                        )}
                        {info.sourceUrl ? (
                          <a
                            href={info.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-forest-700 hover:text-forest-800 mt-1"
                          >
                            Source: {info.source} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <p className="text-xs text-forest-700 mt-1">Source: {info.source}</p>
                        )}
                      </div>
                    )}
                    {!isLoading && info === null && (
                      <p className="text-xs text-gray-400">No public FDA reference entry found for this medicine.</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200/70">
        <div className="flex items-center gap-2 mb-3">
          <Globe2 className="w-4 h-4 text-blue-500" />
          <h4 className="font-medium text-gray-900">India Health Context</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          National-level statistics for India — general context, not specific to this patient.
        </p>
        {healthContext === undefined && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading national health statistics…
          </div>
        )}
        {healthContext === null && (
          <p className="text-xs text-gray-400">Could not load WHO statistics right now.</p>
        )}
        {healthContext && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {healthContext.indicators.map((ind) => (
                <a
                  key={ind.label}
                  href={ind.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 hover:bg-blue-100/60 transition-colors block"
                >
                  <p className="text-lg font-bold text-blue-700">{ind.value}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{ind.unit}</p>
                  <p className="text-xs text-gray-700 font-medium mt-1">{ind.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                    {ind.year} <ExternalLink className="w-2.5 h-2.5" />
                  </p>
                </a>
              ))}
            </div>
            <p className="text-xs text-forest-700 mt-3">Source: {healthContext.source}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosisContextPanel;
