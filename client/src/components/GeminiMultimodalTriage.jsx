import React, { useState, useRef } from 'react';
import { 
  Sparkles, Camera, Mic, Upload, Play, Square, CheckCircle, AlertTriangle, 
  Send, Copy, Check, Hospital, MapPin, Activity, FileText, HeartPulse, Stethoscope, RefreshCw
} from 'lucide-react';

export default function GeminiMultimodalTriage({ onNavigateToHospitalRanker }) {
  const [textInput, setTextInput] = useState("Deep leg laceration with potential arterial bleeding, patient conscious but pale");
  
  // Image State
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);

  // Audio State
  const [audioFile, setAudioFile] = useState(null);
  const [audioBase64, setAudioBase64] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Location State
  const [location, setLocation] = useState({ lat: 17.38, lng: 78.48 });

  // Processing & Output State
  const [isLoading, setIsLoading] = useState(false);
  const [triageOutput, setTriageOutput] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedJSON, setCopiedJSON] = useState(false);

  // Pre-fill Sample Emergency Scenarios
  const presetScenarios = [
    {
      title: "Leg Laceration (Arterial)",
      text: "Deep leg laceration with potential arterial bleeding, patient showing signs of heavy blood loss",
      urgency: "CRITICAL_LEVEL_1"
    },
    {
      title: "Cardiac Emergency",
      text: "Severe substernal chest pain radiating to left arm with shortness of breath and diaphoresis",
      urgency: "HIGH_LEVEL_2"
    },
    {
      title: "Traumatic Head Injury",
      text: "Fall from height, temporary loss of consciousness, confusion, anisocoria observed",
      urgency: "CRITICAL_LEVEL_1"
    }
  ];

  // Image Upload Handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Webcam Capture Handler
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMsg("Camera access denied or unavailable.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setImageBase64(dataUrl);
    
    // Stop camera stream
    if (videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  // Audio Upload Handler
  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAudioBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Microphone Audio Recording Handler
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone recording error:", err);
      setErrorMsg("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Submit to Gemini Multimodal API
  const handleAnalyze = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/doctor/multimodal-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textInput,
          imageBase64: imageBase64,
          audioBase64: audioBase64,
          patient_location: location
        })
      });

      const data = await response.json();
      if (response.ok && data.urgency_level) {
        setTriageOutput(data);
      } else {
        throw new Error(data.message || 'Failed to parse Gemini triage response');
      }
    } catch (err) {
      console.error('Gemini Triage API error:', err);
      setErrorMsg('Error invoking Gemini Multimodal API: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyJSONToClipboard = () => {
    if (!triageOutput) return;
    navigator.clipboard.writeText(JSON.stringify(triageOutput, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  const handleHandoverToRanker = () => {
    if (!triageOutput) return;
    const handoverPayload = {
      urgency_level: triageOutput.urgency_level,
      detected_condition: triageOutput.detected_condition,
      hard_requirements: triageOutput.hard_requirements,
      patient_location: triageOutput.patient_location
    };
    if (onNavigateToHospitalRanker) {
      onNavigateToHospitalRanker(handoverPayload);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-cyan-950 border border-indigo-800/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold font-mono border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                GEMINI 2.5 FLASH MULTIMODAL API
              </span>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold font-mono border border-cyan-500/30">
                Direct Multimodal Structured JSON
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Stethoscope className="w-8 h-8 text-cyan-400" />
              Multimodal Triage Consultation
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Provide <strong className="text-cyan-300">Text</strong> notes, <strong className="text-emerald-300">Image</strong> (lesion photo/scan), and/or <strong className="text-purple-300">Audio</strong> (voice description/breathing sounds). Gemini analyzes all modalities simultaneously and enforces your exact JSON schema output.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setTextInput("Deep leg laceration with potential arterial bleeding");
                setImageBase64(null);
                setAudioBase64(null);
                setTriageOutput(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Inputs
            </button>
          </div>
        </div>
      </div>

      {/* Preset Quick Scenarios */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px] shrink-0">Quick Presets:</span>
        {presetScenarios.map((scen, idx) => (
          <button
            key={idx}
            onClick={() => setTextInput(scen.text)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 font-medium shrink-0 cursor-pointer transition-all flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {scen.title}
          </button>
        ))}
      </div>

      {/* Main Grid: Inputs (Left) vs Structured Output (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Multimodal Inputs (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Card 1: Text Input */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" /> 1. Text Symptoms & Observations
              </label>
              <span className="text-[11px] text-slate-500">Required or Optional</span>
            </div>
            <textarea
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g. Patient has a deep leg laceration with heavy blood loss..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          {/* Card 2: Image Input */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" /> 2. Image Input (Lesion / Injury Photo)
              </label>
              {imageBase64 && (
                <button
                  onClick={() => setImageBase64(null)}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Clear Image
                </button>
              )}
            </div>

            {/* Webcam Live Frame or Upload Preview */}
            {isCameraActive ? (
              <div className="space-y-2">
                <video ref={videoRef} autoPlay playsInline className="w-full h-48 bg-black rounded-xl object-cover" />
                <button
                  onClick={capturePhoto}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Capture Photo Frame
                </button>
              </div>
            ) : imageBase64 ? (
              <div className="relative group rounded-xl overflow-hidden border border-slate-800">
                <img src={imageBase64} alt="Lesion capture" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                  <button
                    onClick={() => setImageBase64(null)}
                    className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/50">
                  <Upload className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-xs font-bold text-slate-300">Upload Image File</span>
                  <span className="text-[10px] text-slate-500">JPG, PNG, WEBP</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>

                <button
                  onClick={startCamera}
                  className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/50 text-slate-300"
                >
                  <Camera className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-xs font-bold text-slate-300">Use Live Webcam</span>
                  <span className="text-[10px] text-slate-500">Instant Snapshot</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 3: Audio Input */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-400" /> 3. Audio Input (Voice / Speech Sound)
              </label>
              {audioBase64 && (
                <button
                  onClick={() => setAudioBase64(null)}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Clear Audio
                </button>
              )}
            </div>

            {isRecording ? (
              <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <div>
                    <p className="text-xs font-bold text-white">Recording Microphone Audio...</p>
                    <p className="text-xs font-mono text-purple-300">{recordingTime}s elapsed</p>
                  </div>
                </div>
                <button
                  onClick={stopRecording}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" /> Stop Recording
                </button>
              </div>
            ) : audioBase64 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-purple-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-400" /> Audio Recording Attached
                </p>
                <audio controls src={audioBase64} className="w-full h-8" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startRecording}
                  className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/50 text-slate-300"
                >
                  <Mic className="w-6 h-6 text-purple-400 mb-1" />
                  <span className="text-xs font-bold text-slate-300">Record Microphone</span>
                  <span className="text-[10px] text-slate-500">Live Voice / Breath</span>
                </button>

                <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/50">
                  <Upload className="w-6 h-6 text-purple-400 mb-1" />
                  <span className="text-xs font-bold text-slate-300">Upload Audio File</span>
                  <span className="text-[10px] text-slate-500">MP3, WAV, WEBM</span>
                  <input type="file" accept="audio/*" onChange={handleAudioChange} className="hidden" />
                </label>
              </div>
            )}
          </div>

          {/* Location Coordinates */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4 text-rose-400" /> Patient Location Coordinates:
            </span>
            <span className="font-mono text-cyan-300 font-bold bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              Lat: {location.lat}, Lng: {location.lng}
            </span>
          </div>

          {/* Submit Action Button */}
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Generating Gemini Multimodal Schema...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 fill-current text-cyan-200" />
                <span>Execute Gemini Multimodal API</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Right Column: Structured Output Display (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Gemini Structured Output JSON
                </h3>
                <p className="text-xs text-slate-400">Strictly enforced response schema matching prompt criteria</p>
              </div>

              {triageOutput && (
                <button
                  onClick={copyJSONToClipboard}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedJSON ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Schema JSON</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {!triageOutput && !isLoading && (
              <div className="py-16 text-center text-slate-500 space-y-3">
                <Stethoscope className="w-12 h-12 mx-auto text-slate-700 animate-pulse" />
                <p className="text-sm font-semibold text-slate-400">No triage output generated yet.</p>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">Fill in any text, image, or audio input on the left and click "Execute Gemini Multimodal API".</p>
              </div>
            )}

            {isLoading && (
              <div className="py-16 text-center text-slate-300 space-y-4">
                <RefreshCw className="w-10 h-10 mx-auto text-cyan-400 animate-spin" />
                <p className="text-sm font-bold text-cyan-300">Processing Multimodal Inputs through Gemini 2.5 Flash...</p>
                <p className="text-xs text-slate-400">Analyzing text, visual lesion patterns, and audio frequency for triage requirements...</p>
              </div>
            )}

            {triageOutput && !isLoading && (
              <div className="space-y-5">
                
                {/* Highlight Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase font-bold block">Urgency Level</span>
                    <span className="text-sm font-black text-rose-400 mt-1 inline-block px-2.5 py-0.5 rounded bg-rose-950/80 border border-rose-800">
                      {triageOutput.urgency_level}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase font-bold block">Confidence Score</span>
                    <span className="text-sm font-black text-emerald-400 font-mono mt-1 inline-block">
                      {(triageOutput.confidence * 100).toFixed(1)}% ({triageOutput.confidence})
                    </span>
                  </div>
                </div>

                {/* Primary Condition */}
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60">
                  <span className="text-[11px] text-indigo-300 uppercase font-bold block">Detected Condition</span>
                  <p className="text-base font-extrabold text-white mt-1">{triageOutput.detected_condition}</p>
                </div>

                {/* Consultation Summary */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block">Consultation Summary</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{triageOutput.consultation_summary}</p>
                </div>

                {/* Red Flags */}
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/60 space-y-2">
                  <span className="text-[11px] text-rose-400 uppercase font-bold block flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Red Flags & Warnings
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {triageOutput.red_flags?.map((rf, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-rose-900/50 text-rose-200 text-xs font-bold border border-rose-700/50">
                        🚨 {rf}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Hard Requirements Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-[11px] text-cyan-400 uppercase font-bold block">Hard Requirements Schema</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">BED TYPE</span>
                      <span className="text-cyan-300 font-bold">{triageOutput.hard_requirements?.bed_type || 'ICU'}</span>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">BLOOD GROUP</span>
                      <span className="text-rose-400 font-bold">{triageOutput.hard_requirements?.blood_group || 'O_NEG'}</span>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">SPECIALIST</span>
                      <span className="text-purple-300 font-bold">{triageOutput.hard_requirements?.specialist || 'TRAUMA_SURGEON'}</span>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">EQUIPMENT</span>
                      <span className="text-emerald-300 font-bold">{triageOutput.hard_requirements?.equipment?.join(', ') || 'VENTILATOR'}</span>
                    </div>
                  </div>
                </div>

                {/* Handover Action Button */}
                <button
                  onClick={handleHandoverToRanker}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <Hospital className="w-4 h-4" />
                  <span>Handover Requirements to Layer 2 Hospital Matcher</span>
                </button>

                {/* Raw Formatted JSON Code View */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-400 font-mono uppercase font-bold block">Raw JSON Output:</span>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-mono overflow-x-auto max-h-64 leading-relaxed">
                    {JSON.stringify(triageOutput, null, 2)}
                  </pre>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
