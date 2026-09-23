import { useState, useEffect } from 'react';
import { Droplets, Wind, Building2, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { fetchBloodSupplyStats, fetchHealthInfrastructure, fetchAirQualityStations } from '../../utils/indiaOpenData';

const IndiaOpenDataPanel = () => {
  const [bloodData, setBloodData] = useState(undefined);
  const [phcData, setPhcData] = useState(undefined);
  const [aqiData, setAqiData] = useState(undefined);

  useEffect(() => {
    fetchBloodSupplyStats().then(setBloodData);
    fetchHealthInfrastructure().then(setPhcData);
    fetchAirQualityStations().then(setAqiData);
  }, []);

  const bloodYearColumns = bloodData?.collected?.length
    ? Object.keys(bloodData.collected[0]).filter(k => k.toLowerCase().includes('year'))
    : [];

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">India Open Health Data</h3>
        <p className="text-sm text-gray-500">Live public datasets from the Government of India's Open Data Platform (data.gov.in) — national and state-level context, not specific to this patient</p>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          All figures below are fetched live from official Government of India datasets. Nothing here is specific to this patient or this hospital — it's general national/state context.
        </p>
      </div>

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Wind className="w-4 h-4 text-sky-600" />
          <h4 className="font-medium text-gray-900">Real-Time Air Quality — CPCB Monitoring Stations</h4>
        </div>
        {aqiData === undefined && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading live station data…
          </div>
        )}
        {aqiData === null && (
          <p className="text-xs text-gray-400">Could not load air quality data right now.</p>
        )}
        {aqiData && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {aqiData.stations.map((s, i) => (
                <div key={i} className="p-3 bg-sky-50/60 rounded-xl border border-sky-100">
                  <p className="text-sm font-semibold text-gray-900">{s.city}, {s.state}</p>
                  <p className="text-xs text-gray-500">{s.station}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-sky-700">{s.avg_value}</span>
                    <span className="text-xs text-gray-500">{s.pollutant_id} (avg, range {s.min_value}-{s.max_value})</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Last updated: {s.last_update}</p>
                </div>
              ))}
            </div>
            <a
              href={aqiData.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-700 hover:text-sky-800 mt-3"
            >
              Full live dataset (all stations): {aqiData.source} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Droplets className="w-4 h-4 text-red-600" />
          <h4 className="font-medium text-gray-900">Blood Supply — State/UT-wise (e-RaktKosh, 2018-2022)</h4>
        </div>
        {bloodData === undefined && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading blood supply statistics…
          </div>
        )}
        {bloodData === null && (
          <p className="text-xs text-gray-400">Could not load blood supply data right now.</p>
        )}
        {bloodData && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Blood units collected, by state/UT and year</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200/70">
              <table className="min-w-full text-xs">
                <thead className="bg-red-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">State/UT</th>
                    {bloodYearColumns.map(col => (
                      <th key={col} className="text-right px-3 py-2 font-medium text-gray-700 whitespace-nowrap">{col.replace(/_/g, ' ').trim()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloodData.collected.map((row, i) => {
                    const stateKey = Object.keys(row).find(k => k.toLowerCase().includes('state'));
                    return (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-3 py-1.5 text-gray-900 whitespace-nowrap">{row[stateKey]}</td>
                        {bloodYearColumns.map(col => (
                          <td key={col} className="px-3 py-1.5 text-right text-gray-700">{row[col]}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <a
              href={bloodData.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-800 mt-3"
            >
              Source: {bloodData.source} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-forest-700" />
          <h4 className="font-medium text-gray-900">Health Infrastructure — State/UT-wise (Rural Health Statistics)</h4>
        </div>
        {phcData === undefined && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading health infrastructure statistics…
          </div>
        )}
        {phcData === null && (
          <p className="text-xs text-gray-400">Could not load health infrastructure data right now.</p>
        )}
        {phcData && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Sub-Centres, PHCs and CHCs functioning in tribal areas, as per Rural Health Statistics 2005 (most recent version of this dataset published by the Ministry)</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200/70">
              <table className="min-w-full text-xs">
                <thead className="bg-forest-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">State/UT</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-700">Sub-Centres</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-700">PHCs</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-700">CHCs</th>
                  </tr>
                </thead>
                <tbody>
                  {phcData.records.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-1.5 text-gray-900 whitespace-nowrap">{row.state_ut}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{row.sub_centres___r}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{row.phcs___r}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{row.chcs___r}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <a
              href={phcData.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-forest-800 hover:text-forest-900 mt-3"
            >
              Source: {phcData.source} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndiaOpenDataPanel;
