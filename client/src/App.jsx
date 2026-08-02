import React, { useState, useEffect } from 'react';
import { socket, joinRoom } from './services/socket';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import EmergencyMap from './components/EmergencyMap';
import HospitalERDashboard from './components/HospitalERDashboard';
import Layer2HospitalRanker from './components/Layer2HospitalRanker';
import DoctorAvatarVideoCall from './components/DoctorAvatarVideoCall';
import WhatsAppCallApp from './components/WhatsAppCallApp';
import RealtimeVoiceAgent from './components/RealtimeVoiceAgent';
import WhatsAppAIDoctorCall from './components/WhatsAppAIDoctorCall';
import LiveKitFullDuplexCall from './components/LiveKitFullDuplexCall';
import OpenAIRealtimeAgent from './components/OpenAIRealtimeAgent';
import PatientHistoryPage from './components/PatientHistoryPage';
import GeminiMultimodalTriage from './components/GeminiMultimodalTriage';
import confetti from 'canvas-confetti';
import { AlertCircle, X, ShieldAlert, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [doctorPayloadHandover, setDoctorPayloadHandover] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [dispatches, setDispatches] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [alertNotification, setAlertNotification] = useState(null);
  const [pendingReservation, setPendingReservation] = useState(null);
  const [isConfirmingReservation, setIsConfirmingReservation] = useState(false);
  const [confirmationSuccess, setConfirmationSuccess] = useState(null);

  // Socket Connection & Event Listeners
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      joinRoom('er');
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onInitialStore(data) {
      if (data.dispatches) setDispatches(data.dispatches);
      if (data.ambulances) setAmbulances(data.ambulances);
      if (data.dispatches && data.dispatches.length > 0) {
        setActiveDispatch(data.dispatches[0]);
      }
    }

    function onDispatchCreated(newDispatch) {
      setDispatches((prev) => [newDispatch, ...prev]);
      setActiveDispatch(newDispatch);
    }

    function onDispatchUpdated(updatedDispatch) {
      setDispatches((prev) =>
        prev.map((d) => (d.id === updatedDispatch.id ? updatedDispatch : d))
      );
      setActiveDispatch((prev) => (prev?.id === updatedDispatch.id ? updatedDispatch : prev));
    }

    function onAmbulanceUpdated(updatedAmbulance) {
      setAmbulances((prev) =>
        prev.map((a) => (a.id === updatedAmbulance.id ? updatedAmbulance : a))
      );
    }

    function onDispatchLocation(data) {
      setActiveDispatch((prev) => {
        if (!prev || prev.id !== data.dispatchId) return prev;
        return {
          ...prev,
          currentLocation: data.location,
          distance: data.distance,
          eta: data.eta,
          status: data.status,
          patientStatus: data.patientStatus
        };
      });
    }

    function onAlertNew(alertData) {
      setAlertNotification(alertData);
      if (alertData.type === 'ARRIVED') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      setTimeout(() => setAlertNotification(null), 7000);
    }

    function onSimulationStarted() {
      setIsSimulating(true);
    }

    function onSimulationEnded() {
      setIsSimulating(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('store:initial', onInitialStore);
    socket.on('dispatch:created', onDispatchCreated);
    socket.on('dispatch:updated', onDispatchUpdated);
    socket.on('ambulance:updated', onAmbulanceUpdated);
    socket.on('dispatch:location', onDispatchLocation);
    socket.on('alert:new', onAlertNew);
    socket.on('simulation:started', onSimulationStarted);
    socket.on('simulation:ended', onSimulationEnded);

    // Initial API Fetch Fallback
    fetch('/api/dispatch')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.dispatches.length > 0) {
          setDispatches(data.dispatches);
          setActiveDispatch(data.dispatches[0]);
        }
      })
      .catch(() => {});

    fetch('/api/ambulances')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAmbulances(data.ambulances);
      })
      .catch(() => {});

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('store:initial', onInitialStore);
      socket.off('dispatch:created', onDispatchCreated);
      socket.off('dispatch:updated', onDispatchUpdated);
      socket.off('ambulance:updated', onAmbulanceUpdated);
      socket.off('dispatch:location', onDispatchLocation);
      socket.off('alert:new', onAlertNew);
      socket.off('simulation:started', onSimulationStarted);
      socket.off('simulation:ended', onSimulationEnded);
    };
  }, []);

  // Handler: Trigger Emergency SOS
  const handleTriggerEmergencySOS = () => {
    setAlertNotification({
      type: 'SOS_DISPATCH',
      title: '🚨 EMERGENCY SOS ACTIVATED',
      message: 'ALS Ambulance team dispatched to live location! Lock token generated for nearest ICU bed.'
    });
    setActiveTab('er');
    handleSelectPatient('PAT-3341');
  };

  // Handler: Select specific emergency patient case
  const handleSelectPatient = (patientId) => {
    fetch('/api/dispatch/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActiveDispatch(data.dispatch);
          handleStartSimulation();
        }
      })
      .catch((err) => console.error(err));
  };

  // Handler: Select Hospital from Layer 2 and transition to Layer 3 Bed Reservation & Dispatch
  const handleSelectHospitalAndReserve = (hospital, reservationData) => {
    setPendingReservation(reservationData || {
      hospital,
      lock_token: 'LOCK-849201',
      reservation_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      patient_condition: 'Severe internal bleeding',
      urgency_level: 'CRITICAL_LEVEL_1',
      blood_group: 'O_NEG'
    });
    setConfirmationSuccess(null);
    setActiveTab('er');
  };

  // Handler Piece 2: Confirm Reservation & Deduct ICU Bed (Hospital Side)
  const handleConfirmReservation = async (reservationId) => {
    const resId = reservationId || pendingReservation?.reservation_id || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    setIsConfirmingReservation(true);

    try {
      const response = await fetch('/api/hospital/confirm-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: resId })
      });

      const data = await response.json();

      if (response.ok && data.status === 'SUCCESS') {
        setConfirmationSuccess({
          message: data.message || 'Bed confirmed and deducted!',
          updated_icu_beds: data.updated_icu_beds !== undefined ? data.updated_icu_beds : 3
        });
        setAlertNotification({
          type: 'BED_CONFIRMED',
          title: '🏥 BED CONFIRMED & DEDUCTED',
          message: `Hospital ER confirmed lock token! 1 ICU Bed deducted (Beds Remaining: ${data.updated_icu_beds}). Dispatching ambulance...`
        });

        // Trigger ambulance dispatch & live tracking
        handleSelectPatient('PAT-3341');
      } else {
        setAlertNotification({
          type: 'ERROR',
          title: '⚠️ CONFIRMATION FAILED',
          message: data.message || 'Failed to confirm bed reservation'
        });
      }
    } catch (err) {
      setAlertNotification({
        type: 'ERROR',
        title: '⚠️ NETWORK ERROR',
        message: 'Network error calling /api/hospital/confirm-reservation: ' + err.message
      });
    } finally {
      setIsConfirmingReservation(false);
    }
  };

  // Handler: Start Dispatch Trip
  const handleStartSimulation = () => {
    setIsSimulating(true);
    fetch('/api/simulation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed: speedMultiplier })
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) setIsSimulating(false);
      })
      .catch(() => setIsSimulating(false));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        onTriggerEmergencySOS={handleTriggerEmergencySOS}
      />

      {/* Real-time Toast Emergency Alert Banner */}
      {alertNotification && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-md w-full glass-panel p-4 rounded-2xl border-2 border-emerald-500 shadow-2xl shadow-emerald-600/40 animate-bounce">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow">
                🏥
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">{alertNotification.title}</h4>
                <p className="text-xs text-emerald-200 mt-0.5">{alertNotification.message}</p>
              </div>
            </div>
            <button
              onClick={() => setAlertNotification(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Gemini Multimodal API View */}
        {activeTab === 'gemini_multimodal' && (
          <GeminiMultimodalTriage
            onNavigateToHospitalRanker={(payload) => {
              setDoctorPayloadHandover(payload);
              setActiveTab('layer2');
            }}
          />
        )}

        {/* Home Overview View */}
        {activeTab === 'home' && (
          <HomePage
            setActiveTab={setActiveTab}
            onTriggerEmergencySOS={handleTriggerEmergencySOS}
          />
        )}

        {/* LiveKit Full-Duplex WebRTC Engine View */}
        {activeTab === 'livekit_duplex' && (
          <LiveKitFullDuplexCall
            onNavigateToHospitalRanker={(payload) => {
              setDoctorPayloadHandover(payload);
              setActiveTab('layer2');
            }}
          />
        )}

        {/* WhatsApp-Style AI Doctor Voice Call View */}
        {activeTab === 'whatsapp_doctor' && (
          <WhatsAppAIDoctorCall
            onNavigateToHospitalRanker={(payload) => {
              setDoctorPayloadHandover(payload);
              setActiveTab('layer2');
            }}
          />
        )}

        {/* OpenAI WebRTC Realtime Voice Engine */}
        {activeTab === 'openai_rtc' && (
          <OpenAIRealtimeAgent />
        )}



        {/* Doctor AI Avatar Video Consult & Vision Lesion Analyzer View */}
        {activeTab === 'doctor' && (
          <DoctorAvatarVideoCall
            onNavigateToHospitalRanker={(payload) => {
              setDoctorPayloadHandover(payload);
              setActiveTab('layer2');
            }}
          />
        )}

        {/* Real-Time Two-Way Human-Like AI Voice Agent View */}
        {activeTab === 'voice_agent' && (
          <RealtimeVoiceAgent />
        )}

        {/* WhatsApp P2P WebRTC Real-Time Calling View */}
        {activeTab === 'webrtc_call' && (
          <WhatsAppCallApp />
        )}

        {/* Layer 2: Hospital Match Scoring & Ranking Engine View */}
        {activeTab === 'layer2' && (
          <Layer2HospitalRanker
            onSelectHospitalAndReserve={handleSelectHospitalAndReserve}
            externalPayload={doctorPayloadHandover}
          />
        )}

        {/* Layer 3: ER Dispatch & Live GPS Tracker View */}
        {activeTab === 'er' && (
          <>
            {/* Upper Interactive Map Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Real-Time Leaflet Emergency Map Tracker
                </h3>
                {activeDispatch && (
                  <span className="text-xs font-mono text-cyan-400">
                    ACTIVE DISPATCH ID: {activeDispatch.id}
                  </span>
                )}
              </div>
              <EmergencyMap dispatch={activeDispatch} ambulance={ambulances[0]} height="h-[420px]" />
            </div>

            {/* Main Dashboard View */}
            <HospitalERDashboard
              dispatch={activeDispatch}
              onSelectPatient={handleSelectPatient}
              pendingReservation={pendingReservation}
              onConfirmReservation={handleConfirmReservation}
              isConfirmingReservation={isConfirmingReservation}
              confirmationSuccess={confirmationSuccess}
            />
          </>
        )}

        {/* Patient Consultation History Vault View */}
        {activeTab === 'history' && (
          <PatientHistoryPage />
        )}

        {/* System Admin Panel View */}
        {activeTab === 'admin' && (
          <AdminPanelPage />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>CareRoute AI Emergency System — Smart AI Doctor Video Consult & Real-Time ER Dispatch</p>
      </footer>

    </div>
  );
}
