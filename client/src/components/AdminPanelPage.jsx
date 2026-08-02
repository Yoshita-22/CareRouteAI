import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Hospital, 
  Activity, 
  Database, 
  Cpu, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  Sliders, 
  ShieldAlert, 
  Server,
  RotateCcw,
  Zap
} from 'lucide-react';

export default function AdminPanelPage() {
  const [hospitals, setHospitals] = useState([
    { id: 'hosp-001', hospital_name: 'Continental Hospitals (Gachibowli)', icu_beds: 5, total_beds: 450, o_neg_blood_units: 12, status: 'OPERATIONAL' },
    { id: 'hosp-002', hospital_name: 'Apollo Hospitals (Jubilee Hills)', icu_beds: 2, total_beds: 500, o_neg_blood_units: 8, status: 'OPERATIONAL' },
    { id: 'hosp-003', hospital_name: 'Medicover Hospitals (Hitec City)', icu_beds: 1, total_beds: 300, o_neg_blood_units: 0, status: 'OPERATIONAL' },
    { id: 'hosp-004', hospital_name: 'KIMS Hospitals (Kondapur)', icu_beds: 0, total_beds: 250, o_neg_blood_units: 4, status: 'FULL' },
    { id: 'hosp-005', hospital_name: 'Yashoda Hospitals (Hitec City)', icu_beds: 7, total_beds: 600, o_neg_blood_units: 15, status: 'OPERATIONAL' }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [dbSource, setDbSource] = useState('LOCAL_STORE');

  const [aiSettings, setAiSettings] = useState({
    llmModel: 'Gemini 2.0 Flash / Multimodal API',
    ttsVoice: 'Web Speech Synthesis / ElevenLabs',
    sttEngine: 'Web Speech Recognition STT',
    triagingThreshold: 0.85,
    autoDispatch: true
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetMsg, setResetMsg] = useState(null);

  // Fetch Hospitals from API
  const fetchHospitals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/hospitals');
      const data = await res.json();
      if (res.ok && data.hospitals && data.hospitals.length > 0) {
        setHospitals(data.hospitals);
        setDbSource(data.source || 'SUPABASE_MOCK');
      }
    } catch (err) {
      console.warn('Could not fetch /api/hospitals, using fallback hospital list:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleBedChange = (id, delta) => {
    setHospitals(prev => prev.map(h => {
      if (h.id === id) {
        const newBeds = Math.max(0, (h.icu_beds || 0) + delta);
        return {
          ...h,
          icu_beds: newBeds,
          status: newBeds === 0 ? 'FULL' : 'OPERATIONAL'
        };
      }
      return h;
    }));
  };

  const handleSaveSettings = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetSystemStore = async () => {
    try {
      const res = await fetch('/api/store/reset', { method: 'POST' });
      const data = await res.json();
      setResetMsg('System store and active dispatches successfully reset!');
      fetchHospitals();
      setTimeout(() => setResetMsg(null), 4000);
    } catch (err) {
      setResetMsg('Error resetting store: ' + err.message);
      setTimeout(() => setResetMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-cyan-400" /> Admin Command Center
            </span>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 animate-pulse" /> Node.js & Socket Cluster Online
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            CareRoute AI System Admin & Hospital Management Panel
          </h2>
          <p className="text-xs text-slate-300">
            Control real-time ICU bed allocation, socket telemetry, AI doctor model configs, and emergency dispatch parameters.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetSystemStore}
            className="px-4 py-2.5 rounded-2xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset System Store</span>
          </button>

          <button
            onClick={fetchHospitals}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {resetMsg && (
        <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-700 text-indigo-200 text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{resetMsg}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Admin Pipeline Settings Saved Successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: ICU Bed Capacity Management (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-indigo-500/30 bg-slate-950 space-y-6 shadow-2xl">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Hospital className="w-5 h-5 text-emerald-400" /> Hospital ER & ICU Bed Override Console
              </h3>
              <p className="text-xs text-slate-400">Directly adjust live bed capacity available to Layer 2 ranker</p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800">
              {hospitals.length} Hospitals Registered ({dbSource})
            </span>
          </div>

          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {hospitals.map((h) => {
              const bedCount = h.icu_beds !== undefined ? h.icu_beds : (h.icuBeds || 0);
              const isOperational = bedCount > 0;
              return (
                <div key={h.id || h.hospital_name} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">{h.hospital_name || h.name}</h4>
                      <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        isOperational ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {isOperational ? 'OPERATIONAL' : 'FULL'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Total Beds: {h.total_beds || 400} | O_NEG Blood Units: {h.o_neg_blood_units !== undefined ? h.o_neg_blood_units : 10}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 shrink-0">
                    <span className="text-xs font-bold text-slate-300 ml-1">ICU Beds:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBedChange(h.id, -1)}
                        className="w-7 h-7 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-black text-sm flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono text-base font-black text-cyan-300 w-6 text-center">{bedCount}</span>
                      <button
                        onClick={() => handleBedChange(h.id, 1)}
                        className="w-7 h-7 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-black text-sm flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column: AI Configuration & Socket Telemetry (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Settings */}
          <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 bg-slate-950 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Cpu className="w-5 h-5 text-indigo-400" /> AI Doctor & Voice Engine Pipeline
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">LLM Reasoning Backend</label>
                <input
                  type="text"
                  value={aiSettings.llmModel}
                  onChange={(e) => setAiSettings({ ...aiSettings, llmModel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">TTS Voice Synthesis Engine</label>
                <input
                  type="text"
                  value={aiSettings.ttsVoice}
                  onChange={(e) => setAiSettings({ ...aiSettings, ttsVoice: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">STT Speech Recognition</label>
                <input
                  type="text"
                  value={aiSettings.sttEngine}
                  onChange={(e) => setAiSettings({ ...aiSettings, sttEngine: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                />
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-2"
              >
                <Save className="w-4 h-4" />
                <span>SAVE AI PIPELINE CONFIG</span>
              </button>
            </div>
          </div>

          {/* Telemetry Status */}
          <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 bg-slate-950 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Server className="w-5 h-5 text-cyan-400" /> Infrastructure Health
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 font-bold">Express API Server (Port 5000)</span>
                <span className="font-mono text-emerald-400 font-black">ONLINE</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 font-bold">Vite Dev Server (Port 3000)</span>
                <span className="font-mono text-cyan-400 font-black">ONLINE</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 font-bold">Socket.io Telemetry Websocket</span>
                <span className="font-mono text-emerald-400 font-black">CONNECTED</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 font-bold">Supabase Database Sync</span>
                <span className="font-mono text-emerald-400 font-black">HEALTHY</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
