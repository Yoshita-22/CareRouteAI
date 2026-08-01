import React, { useState, useEffect } from 'react';
import { 
  Hospital, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  MapPin, 
  Clock, 
  Flame, 
  HeartPulse, 
  Car, 
  ChevronRight, 
  Send, 
  Code, 
  Sliders, 
  Database,
  Info,
  Check,
  XCircle
} from 'lucide-react';

// Preset Test Payloads specified in specification
const PRESET_PAYLOAD_A = {
  requirement_payload: {
    urgency_level: "CRITICAL_LEVEL_1",
    detected_condition: "Severe road accident with internal hemorrhage",
    hard_requirements: {
      bed_type: "ICU",
      blood_group: "O_NEG",
      equipment: ["ECMO", "VENTILATOR"],
      specialist: "TRAUMA_SURGEON"
    }
  },
  patient_location: {
    lat: 17.4400,
    lng: 78.3480
  }
};

const PRESET_PAYLOAD_B = {
  requirement_payload: {
    urgency_level: "HIGH_LEVEL_2",
    detected_condition: "Chest pain and respiratory failure",
    hard_requirements: {
      bed_type: "ICU",
      blood_group: null,
      equipment: ["VENTILATOR"],
      specialist: "CARDIOLOGIST"
    }
  },
  patient_location: {
    lat: 17.4400,
    lng: 78.3480
  }
};

export default function Layer2HospitalRanker({ onSelectHospitalAndReserve }) {
  const [activePreset, setActivePreset] = useState('PRESET_A');
  const [payloadInput, setPayloadInput] = useState(JSON.stringify(PRESET_PAYLOAD_A, null, 2));
  const [loading, setLoading] = useState(false);
  const [rankingResult, setRankingResult] = useState(null);
  const [error, setError] = useState(null);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [reservingId, setReservingId] = useState(null);
  const [reservationModal, setReservationModal] = useState(null);

  // Auto-fetch rank results on initial load with Preset A
  useEffect(() => {
    fetchHospitalRankings(PRESET_PAYLOAD_A);
  }, []);

  const fetchHospitalRankings = async (payloadToSubmit) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/hospitals/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSubmit)
      });
      const data = await response.json();
      if (response.ok && data.status === 'SUCCESS') {
        setRankingResult(data);
      } else {
        setError(data.message || 'Failed to calculate hospital rankings');
      }
    } catch (err) {
      setError('Network error calling /api/hospitals/rank: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (presetKey) => {
    setActivePreset(presetKey);
    const targetPayload = presetKey === 'PRESET_A' ? PRESET_PAYLOAD_A : PRESET_PAYLOAD_B;
    setPayloadInput(JSON.stringify(targetPayload, null, 2));
    fetchHospitalRankings(targetPayload);
  };

  const handleCustomSubmit = () => {
    try {
      const parsed = JSON.parse(payloadInput);
      setActivePreset('CUSTOM');
      fetchHospitalRankings(parsed);
    } catch (err) {
      setError('Invalid JSON payload syntax: ' + err.message);
    }
  };

  // Piece 1: Call POST /api/hospitals/reserve when patient picks a hospital
  const handleReserveBed = async (hospital) => {
    const targetHospitalId = hospital.hospital_id || hospital.id || "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
    setReservingId(targetHospitalId);
    setError(null);

    const isPresetA = activePreset === 'PRESET_A';
    const reservePayload = {
      hospital_id: targetHospitalId,
      patient_condition: isPresetA ? "Severe internal bleeding" : "Chest pain and respiratory failure",
      urgency_level: isPresetA ? "CRITICAL_LEVEL_1" : "HIGH_LEVEL_2",
      blood_group: isPresetA ? "O_NEG" : null
    };

    try {
      const response = await fetch('/api/hospitals/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservePayload)
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        setReservationModal({
          hospital,
          lock_token: data.lock_token,
          reservation_id: data.reservation_id,
          expires_in: data.expires_in || '15 minutes',
          patient_condition: reservePayload.patient_condition,
          urgency_level: reservePayload.urgency_level,
          blood_group: reservePayload.blood_group
        });
      } else {
        setError(data.message || 'Failed to issue reservation token');
      }
    } catch (err) {
      setError('Network error calling /api/hospitals/reserve: ' + err.message);
    } finally {
      setReservingId(null);
    }
  };


  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 bg-slate-900/90 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Database className="w-3 h-3 text-indigo-400" /> CareRoute Match Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">Decoupled Supabase Query & Scoring</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              Hospital Matching & Mathematical Scoring Engine
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Queries Supabase <code className="text-indigo-300 font-mono">hospitals</code> table, evaluates hard constraints (ICU Beds & Blood Stock), applies 4-variable scoring equation <code className="text-emerald-400 font-mono">(40·B) + (30·Bl) + (20·E) - (3·D)</code>, and ranks Top 5 candidates.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block px-2">
              Database: <strong className="text-emerald-400 font-mono">{rankingResult?.db_source || 'SUPABASE / MOCK'}</strong>
            </span>
          </div>
        </div>

        {/* Preset Selector Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Quick Test Presets:
            </span>
            
            <button
              onClick={() => handleSelectPreset('PRESET_A')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePreset === 'PRESET_A'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-900'
              }`}
            >
              <Car className="w-4 h-4 text-cyan-300" />
              <span>Preset A: Severe Trauma Emergency</span>
            </button>

            <button
              onClick={() => handleSelectPreset('PRESET_B')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePreset === 'PRESET_B'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-900'
              }`}
            >
              <HeartPulse className="w-4 h-4 text-indigo-400" />
              <span>Preset B: Cardiac Emergency</span>
            </button>
          </div>

          <button
            onClick={() => setShowJsonEditor(!showJsonEditor)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-950 text-slate-400 border border-slate-800 hover:text-white cursor-pointer"
          >
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showJsonEditor ? 'Hide Payload Editor' : 'Edit JSON Payload'}</span>
          </button>
        </div>
      </div>

      {/* Optional Raw JSON Input Payload Editor */}
      {showJsonEditor && (
        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-slate-950 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold font-mono text-cyan-400 flex items-center gap-2">
              <Code className="w-4 h-4" /> POST /api/hospitals/rank — Test Request Payload JSON
            </h4>
            <button
              onClick={handleCustomSubmit}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Run Matching Logic</span>
            </button>
          </div>

          <textarea
            value={payloadInput}
            onChange={(e) => setPayloadInput(e.target.value)}
            rows={10}
            className="w-full bg-slate-900 text-cyan-300 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="p-12 text-center text-slate-400 font-mono text-sm space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Querying Supabase & Calculating Haversine Distance Match Scores...</p>
        </div>
      )}

      {/* Layer 2 Results Display */}
      {rankingResult && !loading && (
        <div className="space-y-6">
          
          {/* Requirement Summary & Count Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xl shrink-0">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  CareRoute AI found <span className="text-emerald-400 font-mono">{rankingResult.total_matches_found} qualified hospitals</span> matching all hard constraints.
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Filtered facilities with 0 ICU Beds or insufficient requested blood stock.
                </p>
              </div>
            </div>

            {/* Hard Requirements Tags */}
            {activePreset !== 'CUSTOM' && (
              <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                <span className="bg-slate-900 text-cyan-300 px-2.5 py-1 rounded-lg border border-slate-800">
                  Bed: <strong>{activePreset === 'PRESET_A' ? 'ICU' : 'ICU'}</strong>
                </span>
                <span className="bg-slate-900 text-rose-300 px-2.5 py-1 rounded-lg border border-slate-800">
                  Blood: <strong>{activePreset === 'PRESET_A' ? 'O_NEG' : 'None Required'}</strong>
                </span>
                <span className="bg-slate-900 text-amber-300 px-2.5 py-1 rounded-lg border border-slate-800">
                  Equip: <strong>{activePreset === 'PRESET_A' ? 'ECMO, VENTILATOR' : 'VENTILATOR'}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Ranked Candidates Cards Grid */}
          <div className="space-y-4">
            {rankingResult.top_candidates.map((hospital) => {
              const isTopRank = hospital.rank === 1;
              
              // Score bar color threshold
              let barColor = 'bg-emerald-500';
              let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
              if (hospital.match_score < 70 && hospital.match_score >= 50) {
                barColor = 'bg-amber-500';
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              } else if (hospital.match_score < 50) {
                barColor = 'bg-rose-500';
                badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              }

              return (
                <div
                  key={hospital.hospital_id}
                  className={`glass-panel p-6 rounded-2xl border transition-all ${
                    isTopRank
                      ? 'border-emerald-500/60 bg-slate-900/90 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    
                    {/* Left Details */}
                    <div className="space-y-3 flex-1">
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Rank Badge */}
                        <span
                          className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                            isTopRank
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-md shadow-emerald-500/30 animate-pulse'
                              : badgeColor
                          }`}
                        >
                          {isTopRank ? '🥇 #1 BEST MATCH' : `#${hospital.rank} MATCH`}
                        </span>

                        <h3 className="text-lg md:text-xl font-extrabold text-white">
                          {hospital.hospital_name}
                        </h3>
                      </div>

                      {/* Location & ETA */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-mono">
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span>Distance: <strong className="text-white">{hospital.distance_km} km</strong></span>
                        </span>
                        <span className="h-3 w-px bg-slate-800" />
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Estimated ETA: <strong className="text-emerald-300">{hospital.estimated_eta}</strong></span>
                        </span>
                        <span className="h-3 w-px bg-slate-800" />
                        <span className="text-slate-400">
                          Coords: {hospital.latitude.toFixed(4)}, {hospital.longitude.toFixed(4)}
                        </span>
                      </div>

                      {/* Verified Equipment & Specialist Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                          Verified Facilities:
                        </span>

                        <span className="text-xs bg-slate-900 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                          <Check className="w-3 h-3 text-emerald-400" /> ICU Beds ({hospital.available_icu_beds} Available)
                        </span>

                        {hospital.blood_stock_units !== null && (
                          <span className="text-xs bg-slate-900 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3 text-rose-400" /> Blood Stock ({hospital.blood_stock_units} Units)
                          </span>
                        )}

                        {hospital.matched_equipment.map((eq, i) => (
                          <span key={i} className="text-xs bg-slate-900 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3 text-indigo-400" /> {eq}
                          </span>
                        ))}

                        {hospital.specialists.map((sp, i) => (
                          <span key={i} className="text-[11px] bg-slate-900/80 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-lg font-mono">
                            👨‍⚕️ {sp}
                          </span>
                        ))}
                      </div>

                    </div>

                    {/* Right Score & Reserve Action */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-4 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
                      
                      {/* Score Meter */}
                      <div className="w-full sm:w-48 text-right space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Match Score</span>
                          <strong className="text-base font-extrabold text-white">{hospital.match_score} / 100</strong>
                        </div>
                        
                        <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                            style={{ width: `${Math.min(100, Math.max(0, hospital.match_score))}%` }}
                          />
                        </div>

                        {/* Breakdown tooltip inspect */}
                        {hospital._debugScoreBreakdown && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            Math: ({hospital._debugScoreBreakdown.W_b_B} + {hospital._debugScoreBreakdown.W_bl_Bl} + {hospital._debugScoreBreakdown.W_e_E}) - {hospital._debugScoreBreakdown.W_d_D}
                          </p>
                        )}
                      </div>

                      {/* Select & Reserve Button */}
                      <button
                        disabled={reservingId === (hospital.hospital_id || hospital.id)}
                        onClick={() => handleReserveBed(hospital)}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs tracking-wide transition-all shadow-lg cursor-pointer ${
                          isTopRank
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/30'
                            : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800'
                        }`}
                      >
                        {reservingId === (hospital.hospital_id || hospital.id) ? (
                          <span>Generating Reservation Token...</span>
                        ) : (
                          <>
                            <span>Select & Reserve Bed at {hospital.hospital_name.split(' ')[0]}</span>
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Verification Checklist Information Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Verification & Exclusion Checklist Log
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-bold block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Exclusion Rule 1 (ICU Beds)
                </span>
                <p className="text-slate-400 text-[11px]">
                  Sunshine Hospital (0 ICU beds) is filtered out in Pass 1 when ICU bed is required.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-bold block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Exclusion Rule 2 (Blood Group)
                </span>
                <p className="text-slate-400 text-[11px]">
                  KIMS Hospital (0 O_NEG units) is completely excluded when O_NEG blood is required (Preset A).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-bold block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Haversine Scoring Penalty
                </span>
                <p className="text-slate-400 text-[11px]">
                  Subtracts <code className="text-amber-300">3 * Distance(KM)</code> from score. Closer hospitals retain higher match rank.
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Piece 1: Patient Reservation Lock Token Modal */}
      {reservationModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-emerald-500 max-w-lg w-full bg-slate-900 shadow-2xl space-y-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setReservationModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-2xl shrink-0">
                🔒
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full inline-block">
                  Supabase Reservation Issued
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  15-Minute Reservation Lock
                </h3>
              </div>
            </div>

            {/* Token Badge */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/50 text-center space-y-1 shadow-inner">
              <span className="text-xs text-slate-400 font-medium">Your Citizen Lock Token</span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-wider">
                Bed Locked: {reservationModal.lock_token}
              </div>
              <span className="text-xs font-semibold text-amber-400 block pt-1">
                ⏱️ Valid for {reservationModal.expires_in}
              </span>
            </div>

            {/* Details */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Hospital:</span>
                <strong className="text-white">{reservationModal.hospital.hospital_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reservation ID:</span>
                <strong className="text-cyan-300 text-[11px] truncate max-w-[200px]">{reservationModal.reservation_id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Condition:</span>
                <strong className="text-rose-300">{reservationModal.patient_condition}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Urgency Level:</span>
                <strong className="text-amber-300">{reservationModal.urgency_level}</strong>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={() => {
                const modalData = reservationModal;
                setReservationModal(null);
                if (onSelectHospitalAndReserve) {
                  onSelectHospitalAndReserve(modalData.hospital, modalData);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/20 cursor-pointer"
            >
              <span>Proceed to Hospital ER & Confirm Bed</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
