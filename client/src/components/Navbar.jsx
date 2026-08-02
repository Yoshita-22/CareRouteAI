import React from 'react';
import { Activity, ShieldAlert, Sparkles, PhoneCall, Video, Stethoscope, Hospital, History, Settings, Home, Bot } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isConnected, onTriggerEmergencySOS }) {
  const navTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'doctor', label: 'AI Doctor Consult', icon: Stethoscope },
    { id: 'layer2', label: 'Hospital Finder', icon: Hospital },
    { id: 'er', label: 'Emergency Dashboard', icon: ShieldAlert },
    { id: 'history', label: 'Patient History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-3 cursor-pointer group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg tracking-tight text-white group-hover:text-cyan-300 transition-all">
                    Care<span className="text-emerald-400">Route</span>
                  </span>
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">AI Doctor & Emergency Dispatch Platform</p>
              </div>
            </button>
          </div>

          {/* Center Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shrink-0">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Actions: SOS Button + Live Socket Status */}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            
            {/* Quick SOS Trigger */}
            <button
              onClick={onTriggerEmergencySOS}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-rose-600/30 border border-rose-400 cursor-pointer animate-pulse shrink-0"
              title="Instant Emergency SOS Dispatch"
            >
              <ShieldAlert className="w-4 h-4 fill-current" />
              <span className="whitespace-nowrap">SOS EMERGENCY</span>
            </button>

            {/* Socket Status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500' : 'bg-rose-500'}`} />
              <span className="font-mono text-slate-300 text-[11px] whitespace-nowrap">
                {isConnected ? 'SOCKET SYNC' : 'OFFLINE'}
              </span>
            </div>

          </div>

        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-between py-2 border-t border-slate-900 overflow-x-auto gap-2 text-xs">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-lg font-bold shrink-0 flex items-center gap-1 cursor-pointer ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
