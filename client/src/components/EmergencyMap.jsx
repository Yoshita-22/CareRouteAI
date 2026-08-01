import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, ShieldCheck, Gauge, Zap } from 'lucide-react';

// Create custom SVG Leaflet Markers
const createCustomIcon = (type, label = '') => {
  let svgContent = '';

  if (type === 'AMBULANCE') {
    svgContent = `
      <div class="relative flex items-center justify-center w-11 h-11">
        <div class="absolute inset-0 rounded-full bg-rose-500/40 animate-ping"></div>
        <div class="relative w-9 h-9 rounded-full bg-slate-900 border-2 border-rose-500 shadow-lg shadow-rose-500/50 flex items-center justify-center text-white text-lg font-bold">
          🚑
        </div>
      </div>
    `;
  } else if (type === 'PATIENT') {
    svgContent = `
      <div class="relative flex items-center justify-center w-11 h-11">
        <div class="absolute inset-0 rounded-full bg-amber-500/30 animate-pulse"></div>
        <div class="relative w-9 h-9 rounded-full bg-slate-900 border-2 border-amber-500 shadow-lg shadow-amber-500/50 flex items-center justify-center text-white text-base font-bold">
          📍
        </div>
      </div>
    `;
  } else if (type === 'HOSPITAL') {
    svgContent = `
      <div class="relative flex items-center justify-center w-11 h-11">
        <div class="relative w-9 h-9 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-lg shadow-cyan-500/50 flex items-center justify-center text-white text-lg font-bold">
          🏥
        </div>
      </div>
    `;
  }

  return L.divIcon({
    html: svgContent,
    className: 'custom-leaflet-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
};

// Map Recenter Helper Component
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.panTo([center.lat, center.lng], { animate: true, duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

export default function EmergencyMap({ dispatch, ambulance, height = 'h-[460px]' }) {
  const ambPos = dispatch?.currentLocation ||
    (ambulance ? { lat: ambulance.latitude, lng: ambulance.longitude } : { lat: 17.4385, lng: 78.3812 });

  const patientPos = dispatch?.pickupLocation || { lat: 17.4450, lng: 78.3850, address: 'Mindspace IT Park, Hitec City' };
  const hospitalPos = dispatch?.hospitalLocation || { lat: 17.4312, lng: 78.4072, name: 'Apollo Emergency & Trauma Center' };

  // Calculate route polyline line segments
  const polylineCoords = [
    [ambPos.lat, ambPos.lng],
    [patientPos.lat, patientPos.lng],
    [hospitalPos.lat, hospitalPos.lng]
  ];

  // Calculate dynamic progress percent (0 to 100%) based on 18.5 KM total route distance
  const totalRouteDistKm = 18.5;
  const currentDist = dispatch?.distance !== undefined ? dispatch.distance : totalRouteDistKm;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((totalRouteDistKm - currentDist) / totalRouteDistKm) * 100)));

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950`}>
      
      {/* Top Map Overlay Stats Bar */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-between pointer-events-none">
        
        <div className="glass-panel px-4 py-2.5 rounded-xl border border-slate-700/60 shadow-xl flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400">Live GPS Routing</span>
          </div>

          {dispatch && (
            <>
              <div className="h-4 w-px bg-slate-700" />
              <div>
                <span className="text-[9px] uppercase text-slate-400 block font-bold">Distance</span>
                <span className="text-sm font-extrabold font-mono text-white">{dispatch.distance || '0.0'} km</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <div>
                <span className="text-[9px] uppercase text-slate-400 block font-bold">ETA</span>
                <span className="text-sm font-extrabold font-mono text-emerald-400">{dispatch.eta || '0'} min</span>
              </div>
            </>
          )}
        </div>

        {/* Live Automatic Stream, 20KM Radius & 30MIN ETA Cap Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="glass-panel px-3 py-2 rounded-xl border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 shadow-lg">
            MAX ETA: <strong className="text-emerald-400">30 MIN</strong> (20 KM CAP)
          </div>
          <div className="glass-panel px-3.5 py-2 rounded-xl border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AUTOMATIC GPS STREAMING</span>
          </div>
        </div>

      </div>

      {/* Leaflet Map Container */}
      <MapContainer
        center={[ambPos.lat, ambPos.lng]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapRecenter center={ambPos} />

        {/* Ambulance Marker */}
        <Marker position={[ambPos.lat, ambPos.lng]} icon={createCustomIcon('AMBULANCE')}>
          <Popup className="custom-popup">
            <div className="p-1 text-slate-900">
              <strong className="text-sm font-bold text-rose-600 block">🚑 {dispatch?.ambulanceNumber || ambulance?.vehicleNumber || 'ALS Ambulance'}</strong>
              <span className="text-xs text-slate-700 block">Driver: {dispatch?.driverName || ambulance?.driverName || 'Vikram Singh'}</span>
              <span className="text-xs font-mono font-bold text-emerald-700 block mt-1">Status: {dispatch?.patientStatus || 'DISPATCHED'}</span>
            </div>
          </Popup>
        </Marker>

        {/* Patient Pickup Marker */}
        <Marker position={[patientPos.lat, patientPos.lng]} icon={createCustomIcon('PATIENT')}>
          <Popup>
            <div className="p-1 text-slate-900">
              <strong className="text-sm font-bold text-amber-600 block">📍 Patient Pickup Location</strong>
              <span className="text-xs text-slate-700 block">{patientPos.address}</span>
              <span className="text-xs font-bold text-rose-700 block mt-1">Patient: {dispatch?.patientName || 'Rahul Verma'}</span>
            </div>
          </Popup>
        </Marker>

        {/* Hospital Destination Marker */}
        <Marker position={[hospitalPos.lat, hospitalPos.lng]} icon={createCustomIcon('HOSPITAL')}>
          <Popup>
            <div className="p-1 text-slate-900">
              <strong className="text-sm font-bold text-cyan-600 block">🏥 {hospitalPos.name || 'Apollo Emergency Hospital'}</strong>
              <span className="text-xs text-slate-700 block">Trauma ER Bay 4 Ready</span>
            </div>
          </Popup>
        </Marker>

        {/* Route Line */}
        <Polyline
          positions={polylineCoords}
          pathOptions={{
            color: '#f43f5e',
            weight: 5,
            opacity: 0.8,
            dashArray: '8, 8',
            lineJoin: 'round'
          }}
        />
      </MapContainer>

      {/* Bottom Telemetry Overlay Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-[400] glass-panel p-3 rounded-xl border border-slate-700/60 shadow-2xl flex items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Gauge className="w-4 h-4" />
            <span>52 km/h</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div className="text-slate-300 font-sans text-[11px]">
            Corridor: <strong className="text-emerald-400 font-mono">🟢 GREEN LIGHT PROTOCOL ACTIVE</strong>
          </div>
        </div>

        {/* Live Transit Progress Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <span className="text-[10px] text-slate-400 font-sans">Route Progress:</span>
          <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-white">{progressPercent}%</span>
        </div>
      </div>

    </div>
  );
}
