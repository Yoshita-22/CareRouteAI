import React from 'react';
import { 
  CheckCircle2, 
  Play, 
  MapPin, 
  UserCheck, 
  Navigation, 
  Hospital, 
  Award, 
  Phone, 
  ShieldAlert, 
  Activity, 
  Clock, 
  Compass 
} from 'lucide-react';

export default function DriverDashboard({ dispatch, onUpdateStatus }) {
  if (!dispatch) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center max-w-2xl mx-auto my-12 border border-slate-800">
        <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto mb-3 animate-pulse" />
        <h3 className="text-xl font-bold text-slate-200">No Active Emergency Dispatch</h3>
        <p className="text-sm text-slate-400 mt-2">
          Waiting for incoming hospital reservation confirmations.
        </p>
      </div>
    );
  }

  const currentStatus = dispatch.status;

  return (
    <div className="space-y-6">
      
      {/* Top Flashing Emergency Alert Header */}
      <div className="glass-panel-danger p-6 rounded-2xl border border-rose-500/40 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-rose-600/50 animate-bounce shrink-0">
              🚨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-500 text-white text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow">
                  PRIORITY: {dispatch.priority || 'CRITICAL'}
                </span>
                <span className="text-xs font-mono text-rose-300">
                  TOKEN: #{dispatch.reservationToken}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1">
                EMERGENCY ALS DISPATCH ASSIGNED
              </h2>
              <p className="text-xs text-rose-200 mt-0.5">
                Patient: <strong className="text-white">{dispatch.patientName}</strong> ({dispatch.emergencyType})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-3 rounded-xl border border-rose-500/30">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Live Distance</span>
              <span className="text-xl font-extrabold font-mono text-white">{dispatch.distance || '0.0'} km</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Time</span>
              <span className="text-xl font-extrabold font-mono text-emerald-400">{dispatch.eta || '0'} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pickup & Destination Details Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" /> Transit Navigation & Locations
          </h3>

          <div className="space-y-3">
            {/* Pickup */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/20 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                📍
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">Patient Pickup Location</span>
                <p className="text-sm font-semibold text-slate-100">{dispatch.pickupLocation?.address || 'Hitec City, Hyderabad'}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  GPS: {dispatch.pickupLocation?.lat?.toFixed(4)}, {dispatch.pickupLocation?.lng?.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Destination Hospital */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/20 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                🏥
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">Destination ER Hospital</span>
                <p className="text-sm font-semibold text-slate-100">{dispatch.hospitalName || 'Apollo Emergency Hospital'}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {dispatch.hospitalLocation?.address || 'Jubilee Hills, Road No. 36'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Ambulance Unit: <strong className="text-slate-200">{dispatch.ambulanceNumber} ({dispatch.ambulanceType})</strong></span>
            <span>Hospital Status: <strong className="text-emerald-400">CONFIRMED</strong></span>
          </div>
        </div>

        {/* Driver Action Control Pad - Always Enabled & Clickable */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-rose-400" /> Driver Action Controls
            </h3>
            <p className="text-xs text-slate-400">
              Click any action button below to instantly update the emergency dispatch status across all connected Hospital ER monitors in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            {/* Button 1: Accept Dispatch */}
            <button
              onClick={() => onUpdateStatus('DISPATCHED')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:scale-[1.02] ${
                currentStatus === 'DISPATCHED'
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-rose-600/40 animate-pulse'
                  : 'bg-rose-700/80 hover:bg-rose-600 text-white border border-rose-500/40'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>1. Accept Dispatch</span>
            </button>

            {/* Button 2: Start Trip */}
            <button
              onClick={() => onUpdateStatus('EN_ROUTE')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:scale-[1.02] ${
                currentStatus === 'EN_ROUTE'
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-amber-600/40 animate-pulse'
                  : 'bg-amber-700/80 hover:bg-amber-600 text-white border border-amber-500/40'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>2. Start Trip</span>
            </button>

            {/* Button 3: Arrived at Pickup */}
            <button
              onClick={() => onUpdateStatus('ARRIVED_PICKUP')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:scale-[1.02] ${
                currentStatus === 'ARRIVED_PICKUP'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-indigo-600/40 animate-pulse'
                  : 'bg-indigo-700/80 hover:bg-indigo-600 text-white border border-indigo-500/40'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>3. Arrived at Pickup</span>
            </button>

            {/* Button 4: Patient Picked Up */}
            <button
              onClick={() => onUpdateStatus('PATIENT_PICKED_UP')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:scale-[1.02] ${
                currentStatus === 'PATIENT_PICKED_UP'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-purple-600/40 animate-pulse'
                  : 'bg-purple-700/80 hover:bg-purple-600 text-white border border-purple-500/40'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>4. Patient Picked Up</span>
            </button>

            {/* Button 5: Start Hospital Transit */}
            <button
              onClick={() => onUpdateStatus('TRANSIT_HOSPITAL')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:scale-[1.02] ${
                currentStatus === 'TRANSIT_HOSPITAL'
                  ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-cyan-600/40 animate-pulse'
                  : 'bg-cyan-700/80 hover:bg-cyan-600 text-white border border-cyan-500/40'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>5. Start Hospital Transit</span>
            </button>

            {/* Button 6: Arrived at Hospital */}
            <button
              onClick={() => onUpdateStatus('ARRIVED_HOSPITAL')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:scale-[1.02] ${
                ['ARRIVED_HOSPITAL', 'ARRIVING_SOON'].includes(currentStatus)
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-emerald-600/40 animate-pulse'
                  : 'bg-emerald-700/80 hover:bg-emerald-600 text-white border border-emerald-500/40'
              }`}
            >
              <Hospital className="w-4 h-4" />
              <span>6. Arrived at Hospital</span>
            </button>

          </div>

          {/* Complete Mission */}
          <button
            onClick={() => onUpdateStatus('COMPLETED')}
            className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xl cursor-pointer hover:scale-[1.01] flex items-center justify-center gap-2 ${
              currentStatus === 'COMPLETED'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-400 shadow-emerald-500/50 animate-pulse'
                : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white border border-emerald-500/40'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>7. Complete Emergency Mission</span>
          </button>
        </div>

      </div>

    </div>
  );
}
