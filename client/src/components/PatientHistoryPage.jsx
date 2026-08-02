import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Search, 
  Calendar, 
  User, 
  Stethoscope, 
  ShieldCheck, 
  Clock, 
  FileText, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export default function PatientHistoryPage() {
  const [conversations, setConversations] = useState([
    {
      id: 'PAT-CONV-9021',
      date: '2026-08-01 23:40',
      doctor: 'Dr. Evelyn Vance, MD',
      specialty: 'Senior ER Trauma Lead',
      symptoms: 'Patient reported 2nd-degree thermal skin burn lesion on left arm with intense pain and skin blistering.',
      condition: 'Severe 2nd-degree burn lesion with cutaneous trauma and acute pain',
      urgency: 'CRITICAL_LEVEL_1',
      remedies: [
        'Cool burn with running water for 15 minutes',
        'Apply sterile non-adherent dressing',
        'Elevate arm above heart level',
        'Emergency ICU bed transfer requested'
      ],
      hospitalMatched: 'City General Emergency Hospital (98% Match Score)',
      status: 'HANDOVER_COMPLETED'
    },
    {
      id: 'PAT-CONV-8812',
      date: '2026-07-28 14:15',
      doctor: 'Dr. Alexander Sterling, MD',
      specialty: 'Chief Emergency Physician',
      symptoms: 'Acute chest pain radiating to left shoulder, shortness of breath, elevated blood pressure.',
      condition: 'Acute Coronary Syndrome / Myocardial Ischemia Suspected',
      urgency: 'CRITICAL_LEVEL_1',
      remedies: [
        'Administer supplemental oxygen',
        'ECG telemetry monitoring immediately',
        'Sublingual Nitroglycerin administration',
        'Cath-Lab ICU readiness activated'
      ],
      hospitalMatched: 'Apollo Critical Care Center (96% Match Score)',
      status: 'DISPATCH_COMPLETED'
    },
    {
      id: 'PAT-CONV-7401',
      date: '2026-07-15 09:30',
      doctor: 'Dr. Maya Patel, MD',
      specialty: 'Consultant Critical Care Specialist',
      symptoms: 'Sudden onset severe migraine, photophobia, double vision, nausea.',
      condition: 'Acute Neurological Evaluation / Migraine Aura',
      urgency: 'MODERATE_LEVEL_2',
      remedies: [
        'Rest in dark quiet room',
        'Hydration & IV Analgesics',
        'Stat CT Brain scan scheduled'
      ],
      hospitalMatched: 'Care Super Specialty (92% Match Score)',
      status: 'RESOLVED'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(conversations[0]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVault = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/doctor/conversations');
      const data = await res.json();
      if (data.status === 'SUCCESS' && data.conversations && data.conversations.length > 0) {
        setConversations(data.conversations);
        setSelectedRecord(data.conversations[0]);
      }
    } catch (err) {
      console.warn('Using local vault data fallback');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVault();
  }, []);

  const filteredConversations = conversations.filter(c => 
    c.doctor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.condition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.symptoms?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5 text-emerald-400" /> Supabase Encrypted Patient Vault
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Patient Consultation History & Medical Vault
          </h2>
          <p className="text-xs text-slate-300">
            Complete record of AI doctor diagnostic sessions, symptom transcripts, remedies, and hospital dispatches.
          </p>
        </div>

        <button
          onClick={fetchVault}
          disabled={isLoading}
          className="px-4 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-cyan-300 border border-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Vault Data</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left List Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search records by doctor, condition, ID..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Record List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredConversations.map((rec) => (
              <div
                key={rec.id}
                onClick={() => setSelectedRecord(rec)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  selectedRecord?.id === rec.id
                    ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/30 shadow-xl'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{rec.id}</span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" /> {rec.date}
                  </span>
                </div>

                <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-emerald-400 shrink-0" />
                  {rec.doctor}
                </h4>

                <p className="text-xs text-slate-300 font-medium line-clamp-2">
                  {rec.condition || rec.symptoms}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                  <span className="font-mono text-rose-400 font-bold">{rec.urgency}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {rec.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right Details Column (7 cols) */}
        <div className="lg:col-span-7">
          {selectedRecord ? (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/40 bg-slate-950 space-y-6 shadow-2xl">
              
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">RECORD DETAILS</span>
                  <h3 className="text-xl font-black text-white">{selectedRecord.doctor}</h3>
                  <p className="text-xs text-slate-400">{selectedRecord.specialty}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono text-slate-400 block">{selectedRecord.date}</span>
                  <span className="text-xs font-mono font-black text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-800">
                    {selectedRecord.urgency}
                  </span>
                </div>
              </div>

              {/* Patient Reported Symptoms */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" /> Patient Reported Symptoms
                </h4>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedRecord.symptoms}
                </div>
              </div>

              {/* Diagnostic Condition */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> Diagnosed Condition
                </h4>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/40 text-xs text-indigo-200 font-bold">
                  {selectedRecord.condition}
                </div>
              </div>

              {/* Prescribed Immediate Remedies */}
              {selectedRecord.remedies && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Prescribed Immediate Protocol
                  </h4>
                  <ul className="space-y-2">
                    {selectedRecord.remedies.map((rem, idx) => (
                      <li key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Matched Hospital */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">DISPATCHED / MATCHED HOSPITAL</span>
                  <span className="font-bold text-white text-sm">{selectedRecord.hospitalMatched}</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase">
                  CONFIRMED
                </span>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl border border-slate-800 bg-slate-950 text-center text-slate-500 text-xs">
              Select a record to view detailed medical transcript
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
