import React from 'react';
import { 
  Hospital, 
  Activity, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  PhoneCall, 
  FileText, 
  ChevronRight,
  Sparkles,
  HeartPulse,
  Car,
  Brain,
  Wind,
  ShieldAlert,
  Baby,
  Biohazard,
  Flame
} from 'lucide-react';

const STATUS_PROGRESSION = [
  { key: 'CONFIRMED', label: 'Reservation Confirmed', desc: 'Token reserved by Hospital ER' },
  { key: 'DISPATCHED', label: 'Ambulance Dispatched', desc: 'ALS unit allocated' },
  { key: 'EN_ROUTE', label: 'Ambulance En Route', desc: 'Driver en route to pickup' },
  { key: 'ARRIVED_PICKUP', label: 'Arrived at Pickup', desc: 'Paramedics on scene' },
  { key: 'PATIENT_PICKED_UP', label: 'Patient Picked Up', desc: 'Patient secured in ambulance' },
  { key: 'TRANSIT_HOSPITAL', label: 'In Transit to Hospital', desc: 'High-priority transit active' },
  { key: 'ARRIVING_SOON', label: 'Arriving Soon', desc: 'Within 1.0 km radius of ER' },
  { key: 'ARRIVED_HOSPITAL', label: 'Arrived at Hospital', desc: 'Handover to Trauma Team' },
  { key: 'COMPLETED', label: 'Emergency Completed', desc: 'Patient in Trauma Bay' }
];

const EMERGENCY_CASES = [
  { id: "PAT-8092", label: "Acute Coronary STEMI", category: "Cardiac", priority: "CRITICAL", icon: HeartPulse, color: "text-rose-400 border-rose-500/40 bg-rose-500/10" },
  { id: "PAT-3341", label: "Polytrauma Road Accident", category: "Trauma", priority: "CRITICAL", icon: Car, color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
  { id: "PAT-5520", label: "Acute Ischemic Stroke", category: "Neurology", priority: "CRITICAL", icon: Brain, color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" },
  { id: "PAT-1184", label: "Severe Asthmatic Failure", category: "Pulmonology", priority: "HIGH", icon: Wind, color: "text-indigo-400 border-indigo-500/40 bg-indigo-500/10" },
  { id: "PAT-7749", label: "Anaphylactic Shock", category: "Allergy", priority: "HIGH", icon: ShieldAlert, color: "text-purple-400 border-purple-500/40 bg-purple-500/10" },
  { id: "PAT-4402", label: "Pediatric Febrile Seizures", category: "Pediatrics", priority: "HIGH", icon: Baby, color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
  { id: "PAT-9915", label: "Toxic Chemical Inhalation", category: "Toxicology", priority: "HIGH", icon: Biohazard, color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" },
  { id: "PAT-6638", label: "Third-Degree Burn Trauma", category: "Burn Trauma", priority: "CRITICAL", icon: Flame, color: "text-orange-400 border-orange-500/40 bg-orange-500/10" }
];

export default function HospitalERDashboard({ dispatch, onSelectPatient, pendingReservation, onConfirmReservation, isConfirmingReservation, confirmationSuccess }) {
  if (!dispatch && !pendingReservation) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center max-w-2xl mx-auto my-12 border border-slate-800">
        <Hospital className="w-12 h-12 text-slate-500 mx-auto mb-3 animate-pulse" />
        <h3 className="text-xl font-bold text-slate-200">No Active Hospital ER Dispatches</h3>
        <p className="text-sm text-slate-400 mt-2">
          Waiting for patient reservation token creation and bed confirmation.
        </p>
      </div>
    );
  }

  // Find index of current status in progression
  const currentKey = dispatch?.status || 'CONFIRMED';
  let activeIndex = STATUS_PROGRESSION.findIndex((s) => s.key === currentKey);
  if (activeIndex === -1) activeIndex = 0;

  return (
    <div className="space-y-6">
      
      {/* Piece 2: Hospital Bed Deduction & Confirmation Banner */}
      {pendingReservation && (
        <div className="glass-panel p-6 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-2xl shrink-0 shadow-lg animate-pulse">
                🏥
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                    Pending Hospital Confirmation
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Token: <strong className="text-amber-300">{pendingReservation.lock_token || 'LOCK-849201'}</strong>
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-black text-white mt-1">
                  Incoming Patient Reservation Alert
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Condition: <strong className="text-rose-300">{pendingReservation.patient_condition || 'Severe internal bleeding'}</strong> ({pendingReservation.urgency_level || 'CRITICAL_LEVEL_1'})
                </p>
              </div>
            </div>

            <button
              disabled={isConfirmingReservation}
              onClick={() => onConfirmReservation && onConfirmReservation(pendingReservation.reservation_id)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer shrink-0"
            >
              {isConfirmingReservation ? (
                <span>Deducting ICU Bed in Supabase...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Reservation & Deduct ICU Bed</span>
                </>
              )}
            </button>
          </div>

          {confirmationSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center justify-between">
              <span>✅ {confirmationSuccess.message}</span>
              <span>Updated ICU Beds Remaining: <strong>{confirmationSuccess.updated_icu_beds}</strong></span>
            </div>
          )}
        </div>
      )}

      
      {/* ER Monitor Banner Header */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 bg-slate-900/90 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-2xl shadow-lg shrink-0">
              🏥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  TRAUMA BAY #4 READY
                </span>
                <span className="text-xs font-mono text-slate-400">
                  TOKEN: #{dispatch?.reservationToken || pendingReservation?.lock_token || 'LOCK-849201'}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1">
                EMERGENCY ROOM LIVE DISPATCH MONITOR
              </h2>
              <p className="text-xs text-slate-300">
                Hospital: <strong className="text-cyan-300">{dispatch?.hospitalName || pendingReservation?.hospital?.hospital_name || 'Apollo Health City'}</strong>
              </p>
            </div>
          </div>

          {/* Dynamic Live Status Badge */}
          <div className="flex items-center gap-4 bg-slate-950 px-5 py-3 rounded-xl border border-slate-800">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Ambulance ETA</span>
              <span className="text-2xl font-extrabold font-mono text-emerald-400">{dispatch?.eta || '0'} min</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance</span>
              <span className="text-xl font-extrabold font-mono text-white">{dispatch?.distance || '0.0'} km</span>
            </div>
          </div>

        </div>
      </div>



      {/* Patient Profile & Assigned Ambulance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Patient Vitals Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
            <User className="w-4 h-4" /> Incoming Patient Data
          </h4>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">{dispatch?.patientName || 'Priya Sharma'}</h3>
              <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                {dispatch?.severity || pendingReservation?.urgency_level || 'CRITICAL'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{dispatch?.emergencyType || pendingReservation?.patient_condition || 'Severe Road Accident'}</p>
          </div>

          {/* Vitals Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Blood Pressure</span>
              <span className="text-white font-bold">{dispatch?.vitals?.bp || '155/98 mmHg'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Heart Rate</span>
              <span className="text-rose-400 font-bold">{dispatch?.vitals?.hr || '112 bpm'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">SpO2 Level</span>
              <span className="text-amber-400 font-bold">{dispatch?.vitals?.spo2 || '91%'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Body Temp</span>
              <span className="text-cyan-400 font-bold">{dispatch?.vitals?.temp || '98.6 °F'}</span>
            </div>
          </div>
        </div>

        {/* Assigned Ambulance Specs Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            🚑 Dispatched Ambulance Unit
          </h4>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white font-mono">{dispatch?.ambulanceNumber || 'AP 09 AB 1234'}</h3>
              <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                {dispatch?.ambulanceType || 'ALS'} UNIT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Driver: <strong className="text-slate-200">{dispatch?.driverName || 'Vikram Singh'}</strong></p>
            <p className="text-xs text-slate-400">Phone: <span className="font-mono text-cyan-400">{dispatch?.driverPhone || '+91 98765 43210'}</span></p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Onboard ALS Equipment</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {(dispatch?.equipment && dispatch.equipment.length > 0
                ? dispatch.equipment
                : ['Advanced Cardiac Life Support', 'Ventilator', 'Defibrillator', 'Multi-para Monitor', 'IV Infusion Pump', 'Oxygen Cylinder']
              ).map((eq, i) => (
                <span key={i} className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                  ✓ {eq}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Status Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-2">
              <Activity className="w-4 h-4" /> Live Status Progression
            </h4>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">Current Patient Status</span>
              <p className="text-lg font-black text-emerald-400 mt-0.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                {dispatch?.patientStatus || (confirmationSuccess ? 'Bed Confirmed & Deducted' : 'Reservation Pending Confirmation')}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Reservation Token</span>
              <strong className="text-white font-mono">{dispatch?.reservationToken || pendingReservation?.lock_token || 'LOCK-849201'}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Dispatched At</span>
              <strong className="text-slate-300 font-mono text-[11px]">
                {dispatch?.createdAt ? new Date(dispatch.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
              </strong>
            </div>
          </div>
        </div>


      </div>

      {/* Visual Emergency Lifecycle Progression Stepper */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> Patient Emergency Progression Timeline
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-2 pt-2">
          {STATUS_PROGRESSION.map((step, idx) => {
            const isPassed = idx <= activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <div
                key={step.key}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-rose-500/10 border-rose-500/60 shadow-lg shadow-rose-500/20 text-white animate-pulse-glow'
                    : isPassed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold">STEP 0{idx + 1}</span>
                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-800" />
                  )}
                </div>

                <div>
                  <h5 className="text-xs font-bold leading-snug">{step.label}</h5>
                  <p className="text-[10px] text-slate-400 mt-1 font-normal line-clamp-2">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
