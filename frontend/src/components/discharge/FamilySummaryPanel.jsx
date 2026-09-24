import { useState } from 'react'
import { Sparkles, CheckCircle, Loader2, Trash2, RefreshCw, Pencil, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { generateFamilySummary, saveFamilySummary, removeFamilySummary } from '../../utils/familySummary'

const FamilySummaryPanel = ({ patient, dischargeSummary, role }) => {
  const { user } = useAuth()
  const saved = patient?.discharge?.familySummary
  const [draft, setDraft] = useState(null)
  const [tab, setTab] = useState('english')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!patient?.id || !dischargeSummary) return null

  const startGenerate = async () => {
    setError('')
    setGenerating(true)
    try {
      const result = await generateFamilySummary({ dischargeSummary, patient })
      if (result) setDraft(result)
      else setError('Could not draft the summary right now. Please try again in a moment.')
    } catch (err) {
      console.error('Error generating family summary:', err)
      setError('Could not generate the summary. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const approve = async () => {
    if (!draft?.english?.trim() || !draft?.hindi?.trim()) {
      setError('Both the English and Hindi versions need text before approving.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await saveFamilySummary(patient.id, draft, { email: user?.email, role })
      setDraft(null)
    } catch (err) {
      console.error('Error saving family summary:', err)
      setError('Could not save the summary. Please check your permissions and try again.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setError('')
    setSaving(true)
    try {
      await removeFamilySummary(patient.id)
    } catch (err) {
      console.error('Error removing family summary:', err)
      setError('Could not remove the summary. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const editing = !!draft
  const textFor = (key) => (editing ? draft[key] : saved?.[key])

  return (
    <div className="mt-5 bg-gray-50/50 rounded-xl border border-gray-200/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-forest-700" />
          Family-Friendly Summary
          <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">DRAFT FROM RECORDS</span>
        </h4>
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={startGenerate}
              disabled={generating || saving}
              className="px-3 py-1.5 bg-forest-50 text-forest-700 rounded-lg text-sm border border-forest-200 hover:bg-forest-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : saved ? <RefreshCw size={14} /> : <Sparkles size={14} />}
              {generating ? 'Generating...' : saved ? 'Regenerate' : 'Generate'}
            </button>
          )}
          {!editing && saved && (
            <>
              <button onClick={() => setDraft({ english: saved.english, hindi: saved.hindi })} className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm border border-gray-200 hover:bg-gray-100 transition-colors flex items-center gap-1.5">
                <Pencil size={14} /> Edit
              </button>
              <button onClick={remove} disabled={saving} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                <Trash2 size={14} /> Remove
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        A plain-language explanation of this discharge in English and Hindi, drafted from the recorded diagnosis, medicines, vitals, tests, notes and instructions. Read it carefully and correct anything before approving. Nothing is shown to the family or printed until it is approved.
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {!editing && !saved && !generating && (
        <p className="text-sm text-gray-500 italic">No family summary has been approved for this patient yet.</p>
      )}

      {(editing || saved) && (
        <>
          <div className="flex gap-2 mb-3">
            {[['english', 'English'], ['hindi', 'हिन्दी']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1 rounded-lg text-sm border transition-colors ${tab === key ? 'bg-forest-600 text-white border-forest-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {editing ? (
            <textarea
              value={textFor(tab) || ''}
              onChange={(e) => setDraft({ ...draft, [tab]: e.target.value })}
              rows={12}
              className="w-full text-sm rounded-xl border border-gray-200 bg-white p-3 focus:outline-none focus:ring-2 focus:ring-forest-500/30"
            />
          ) : (
            <div className="text-sm text-gray-800 whitespace-pre-line bg-white rounded-xl border border-gray-200/70 p-4">{textFor(tab)}</div>
          )}

          {editing ? (
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={approve} disabled={saving} className="px-4 py-2 bg-gradient-to-r from-forest-600 to-forest-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Approve & Save
              </button>
              <button onClick={startGenerate} disabled={generating || saving} className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm border border-gray-200 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50">
                {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerate
              </button>
              <button onClick={() => { setDraft(null); setError('') }} className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700">Cancel</button>
            </div>
          ) : (
            <p className="text-xs text-forest-700 mt-3 flex items-center gap-1.5">
              <ShieldCheck size={13} />
              Approved by {saved.approvedByRole} ({saved.approvedBy}) on {new Date(saved.approvedAt).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default FamilySummaryPanel
