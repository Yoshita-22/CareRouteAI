import React from 'react';
import { Activity } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isConnected }) {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & System Title */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 p-0.5 shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    CareRoute <span className="text-cyan-400">AI</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Smart ALS Ambulance Dispatch & Hospital Ranking</p>
              </div>
            </div>

            {/* Navigation Tabs (Layer references removed) */}
            <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('layer2')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'layer2'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hospital Ranker
              </button>

              <button
                onClick={() => setActiveTab('er')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'er'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live ER Tracker
              </button>
            </div>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500' : 'bg-rose-500'}`} />
              <span className="font-mono text-slate-300 text-[11px]">
                {isConnected ? 'LIVE SOCKET SYNC' : 'OFFLINE'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
