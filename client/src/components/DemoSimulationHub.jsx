import React from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Radio, 
  ShieldAlert, 
  Gauge, 
  ListOrdered 
} from 'lucide-react';

export default function DemoSimulationHub({ 
  dispatch, 
  onStartSimulation, 
  onStopSimulation, 
  onResetStore, 
  isSimulating, 
  speed, 
  setSpeed,
  onTriggerFailure 
}) {
  const timeline = dispatch?.timeline || [];

  return (
    <div className="space-y-6">
      
      {/* Simulation Control Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Interactive Command Mode
              </span>
              <span className="text-xs text-slate-400 font-mono">Step 3 End-to-End System Control</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-400 fill-amber-400 animate-bounce" />
              CareRoute AI Emergency Dispatch Simulation
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Provides complete automated hospital reservation confirmation → Smart ALS ambulance selection → Live Socket.IO GPS tracking → Dynamic ETA updates → Driver & Hospital ER dual dashboard synchronization.
            </p>
          </div>

          {/* Speed & Control Bar */}
          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 pl-2">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Speed:
            </span>
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  speed === s
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-slate-800">
          
          <button
            onClick={onStartSimulation}
            disabled={isSimulating}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-extrabold text-sm tracking-wide transition-all shadow-xl ${
              isSimulating
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white shadow-rose-600/40 hover:scale-[1.02] cursor-pointer animate-pulse-glow'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>▶ START EMERGENCY SIMULATION</span>
          </button>

          {isSimulating && (
            <button
              onClick={onStopSimulation}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs bg-slate-800 text-rose-400 border border-rose-500/40 hover:bg-rose-950 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Pause Simulation</span>
            </button>
          )}

          <button
            onClick={onResetStore}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Dispatch System</span>
          </button>

        </div>
      </div>

      {/* Failure & Reroute Edge-Case Test Panel */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Edge-Case & Failure Handling Simulator
        </h3>
        <p className="text-xs text-slate-400">
          Test system resilience under unexpected emergency exceptions:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            onClick={() => onTriggerFailure('DRIVER_REJECT')}
            className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 hover:border-amber-500 text-left cursor-pointer transition-all hover:bg-slate-900"
          >
            <span className="text-xs font-bold text-amber-400 block">⚡ Simulate Driver Rejection</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Triggers algorithm to automatically re-route next best available ALS ambulance</span>
          </button>

          <button
            onClick={() => onTriggerFailure('NO_ALS')}
            className="p-3 rounded-xl bg-slate-950 border border-rose-500/30 hover:border-rose-500 text-left cursor-pointer transition-all hover:bg-slate-900"
          >
            <span className="text-xs font-bold text-rose-400 block">🚑 Simulate No ALS Available</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Tests fallback selection to standard BLS emergency units with hospital warnings</span>
          </button>

          <button
            onClick={() => onTriggerFailure('OFFLINE_UNIT')}
            className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 hover:border-cyan-500 text-left cursor-pointer transition-all hover:bg-slate-900"
          >
            <span className="text-xs font-bold text-cyan-400 block">📡 Simulate GPS Signal Loss</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Recalculates ETA based on last known location coordinates</span>
          </button>
        </div>
      </div>

      {/* Real-time Emergency Timeline Log */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-emerald-400" /> Live Simulation Event Log & Telemetry
        </h3>

        {timeline.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            Click "▶ START EMERGENCY SIMULATION" above to watch live events stream in real-time.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
            {timeline.map((event, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  ✓
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-200 font-bold">{event.title}</strong>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-0.5">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
