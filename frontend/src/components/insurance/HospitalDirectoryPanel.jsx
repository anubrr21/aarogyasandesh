import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Phone, Building2, Loader2, ExternalLink, AlertTriangle, ShieldCheck, Info, HeartPulse } from 'lucide-react';
import { searchHospitalDirectory, cleanField, fetchPMJAYStats } from '../../utils/hospitalDirectory';

const HospitalDirectoryPanel = () => {
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [result, setResult] = useState(undefined);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pmjayStats, setPmjayStats] = useState(undefined);

  useEffect(() => {
    fetchPMJAYStats().then(setPmjayStats);
  }, []);

  const pmjayTotal = pmjayStats?.states?.reduce((sum, s) => sum + (s.number_of_empanelled_hospitals_under_pmjay__as_on_01_03_2025_ || 0), 0);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!state.trim()) return;
    setSearching(true);
    setSearched(true);
    const data = await searchHospitalDirectory({ state, district, maxResults: 30 });
    setResult(data);
    setSearching(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-4 h-4 text-forest-700" />
        <h4 className="font-medium text-gray-900">Hospital Directory & Empanelment Lookup</h4>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Search India's National Hospital Directory (30,000+ hospitals, National Health Portal) — live data, updated monthly. Includes empanelment/collaboration info where hospitals have reported it (e.g. PM-JAY, CGHS).
      </p>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          This is general public directory data, not specific to this patient's policy — always confirm empanelment/cashless eligibility directly with the hospital and your insurer/TPA before treatment.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <HeartPulse className="w-4 h-4 text-rose-600" />
          <h4 className="font-medium text-gray-900">PM-JAY (Ayushman Bharat) Empanelment — State/UT-wise</h4>
        </div>
        {pmjayStats === undefined && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading live PM-JAY statistics…
          </div>
        )}
        {pmjayStats === null && (
          <p className="text-xs text-gray-400">Could not load PM-JAY statistics right now.</p>
        )}
        {pmjayStats && (
          <div>
            <p className="text-xs text-gray-500 mb-2">
              {pmjayTotal?.toLocaleString()} hospitals empanelled under PM-JAY nationwide (as on 01-03-2025) — full state/UT breakdown below.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200/70 max-h-64 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-rose-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">State/UT</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-700">Empanelled Hospitals</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-700">Ayushman Arogya Mandirs</th>
                  </tr>
                </thead>
                <tbody>
                  {pmjayStats.states.map((s, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-1.5 text-gray-900 whitespace-nowrap">{s.state_ut}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{s.number_of_empanelled_hospitals_under_pmjay__as_on_01_03_2025_ ?? '—'}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{s.total_operational_ayushman_arogya_mandir__aam___as_on_28_02_2025_ ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <a
              href={pmjayStats.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 mt-2"
            >
              Source: {pmjayStats.source} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="State (e.g., Maharashtra) *"
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
          required
        />
        <input
          type="text"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="District (optional)"
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
        />
        <button
          type="submit"
          disabled={searching || !state.trim()}
          className="px-5 py-2.5 bg-gradient-to-r from-forest-500 to-forest-600 text-white rounded-xl hover:shadow-lg hover:shadow-forest-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </form>

      {!searched && (
        <p className="text-sm text-gray-400 text-center py-8">Enter a state to search live hospital directory data.</p>
      )}

      {searched && searching && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Searching live hospital directory…
        </div>
      )}

      {searched && !searching && result === null && (
        <p className="text-sm text-gray-400 text-center py-8">Could not load hospital directory data right now. Please try again.</p>
      )}

      {searched && !searching && result && result.hospitals.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No hospitals found for this state/district in the directory. Try a different spelling, or just the state without a district.</p>
      )}

      {searched && !searching && result && result.hospitals.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-3">Showing {result.hospitals.length} of {result.count >= 30 ? '30+' : result.count} results</p>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {result.hospitals.map((h, i) => {
              const name = cleanField(h.hospital_name);
              const address = cleanField(h._address_original_first_line) || cleanField(h._location);
              const dist = cleanField(h.district);
              const pincode = cleanField(h._pincode);
              const phone = cleanField(h.telephone) || cleanField(h.mobile_number) || cleanField(h.emergency_num);
              const specialties = cleanField(h.specialties);
              const beds = cleanField(h._total_num_beds);
              const empanelment = cleanField(h.empanelment_or_collaboration_with);
              const coords = cleanField(h._location_coordinates);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white/70 rounded-xl border border-gray-200/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{name || 'Unnamed hospital'}</p>
                    {coords && (
                      <a
                        href={`https://www.google.com/maps?q=${encodeURIComponent(coords)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-forest-700 hover:text-forest-800 flex items-center gap-1 whitespace-nowrap"
                      >
                        <MapPin className="w-3 h-3" /> Map
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[address, dist, h.state, pincode].filter(Boolean).join(', ')}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600">
                    {phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {phone}</span>
                    )}
                    {beds && (
                      <span>{beds} beds</span>
                    )}
                  </div>
                  {specialties && (
                    <p className="text-xs text-gray-500 mt-1">Specialties: {specialties}</p>
                  )}
                  {empanelment && (
                    <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-forest-50 border border-forest-200 rounded-lg w-fit">
                      <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
                      <span className="text-xs text-forest-800 font-medium">Empanelment/Collaboration: {empanelment}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          <a
            href={result.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-forest-700 hover:text-forest-800 mt-3"
          >
            Source: {result.source} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100 flex items-start gap-2">
        <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          Roadmap: claim data in this app is structured to be compatible with NHCX (National Health Claims Exchange) — India's government-built, FHIR-based claims gateway under ABDM. Full participation requires Health Facility Registry certification, a formal process beyond this app's current scope.
        </p>
      </div>
    </div>
  );
};

export default HospitalDirectoryPanel;
