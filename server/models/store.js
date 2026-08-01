// Store management with in-memory fallback for CareRoute AI system
const seedData = {
  patients: [
    {
      id: "PAT-8092",
      name: "Rahul Verma",
      age: 54,
      gender: "Male",
      emergencyType: "🫀 Acute Coronary Syndrome (STEMI / Severe Chest Pain)",
      severity: "CRITICAL",
      vitals: { bp: "155/98 mmHg", hr: "112 bpm", spo2: "91%", temp: "98.6 °F" },
      pickupLocation: { lat: 17.4450, lng: 78.3850, address: "Mindspace IT Park, Hitec City, Hyderabad" },
      status: "RESERVATION_CONFIRMED"
    },
    {
      id: "PAT-3341",
      name: "Priya Sharma",
      age: 38,
      gender: "Female",
      emergencyType: "🚗 Polytrauma / High-Velocity Road Accident",
      severity: "CRITICAL",
      vitals: { bp: "95/60 mmHg", hr: "135 bpm", spo2: "89%", temp: "97.8 °F" },
      pickupLocation: { lat: 17.4390, lng: 78.3720, address: "Gachibowli Outer Ring Road Junction, Hyderabad" },
      status: "WAITING"
    },
    {
      id: "PAT-5520",
      name: "Venkat Rao",
      age: 67,
      gender: "Male",
      emergencyType: "🧠 Acute Ischemic Stroke (Sudden Facial Droop & Hemiparesis)",
      severity: "CRITICAL",
      vitals: { bp: "178/105 mmHg", hr: "94 bpm", spo2: "94%", temp: "98.8 °F" },
      pickupLocation: { lat: 17.4280, lng: 78.3990, address: "Road No. 12, Banjara Hills, Hyderabad" },
      status: "WAITING"
    },
    {
      id: "PAT-1184",
      name: "Ananya Roy",
      age: 29,
      gender: "Female",
      emergencyType: "🫁 Acute Severe Asthma Attack / Respiratory Distress",
      severity: "HIGH",
      vitals: { bp: "128/82 mmHg", hr: "124 bpm", spo2: "88%", temp: "99.1 °F" },
      pickupLocation: { lat: 17.4520, lng: 78.3680, address: "Kondapur Main Road, Hyderabad" },
      status: "WAITING"
    },
    {
      id: "PAT-7749",
      name: "Mohammed Arshad",
      age: 45,
      gender: "Male",
      emergencyType: "🩸 Anaphylactic Shock / Severe Systemic Allergic Reaction",
      severity: "HIGH",
      vitals: { bp: "85/52 mmHg", hr: "140 bpm", spo2: "90%", temp: "98.2 °F" },
      pickupLocation: { lat: 17.4190, lng: 78.4350, address: "Punjagutta Central Commercial Zone, Hyderabad" },
      status: "WAITING"
    },
    {
      id: "PAT-4402",
      name: "Aarav Gupta",
      age: 6,
      gender: "Male",
      emergencyType: "👶 Pediatric Febrile Seizures & Stridor Airway Distress",
      severity: "HIGH",
      vitals: { bp: "100/65 mmHg", hr: "148 bpm", spo2: "93%", temp: "103.4 °F" },
      pickupLocation: { lat: 17.4480, lng: 78.3910, address: "Madhapur Residential Colony, Hyderabad" },
      status: "WAITING"
    },
    {
      id: "PAT-9915",
      name: "Kavitha Reddy",
      age: 41,
      gender: "Female",
      emergencyType: "☣️ Toxic Chemical Exposure & Hazardous Vapour Inhalation",
      severity: "HIGH",
      vitals: { bp: "138/88 mmHg", hr: "118 bpm", spo2: "92%", temp: "98.7 °F" },
      pickupLocation: { lat: 17.4610, lng: 78.3550, address: "Financial District Tech Park, Nanakramguda, Hyderabad" },
      status: "WAITING"
    },
    {
      id: "PAT-6638",
      name: "Sanjay Kulkarni",
      age: 50,
      gender: "Male",
      emergencyType: "🔥 Third-Degree Thermal Burn Trauma & Airway Scorching",
      severity: "CRITICAL",
      vitals: { bp: "102/64 mmHg", hr: "130 bpm", spo2: "91%", temp: "97.5 °F" },
      pickupLocation: { lat: 17.4110, lng: 78.4120, address: "Jubilee Hills Check Post, Hyderabad" },
      status: "WAITING"
    }
  ],
  ambulances: [
    {
      id: "AMB-101",
      vehicleNumber: "AP 09 AB 1234",
      type: "ALS",
      status: "AVAILABLE",
      driverId: "DRV-501",
      driverName: "Vikram Singh",
      driverPhone: "+91 98765 43210",
      latitude: 17.4385,
      longitude: 78.3812,
      equipment: ["Advanced Cardiac Life Support", "Ventilator", "Defibrillator", "Multi-para Monitor", "IV Infusion Pump"],
      lastUpdated: new Date().toISOString()
    },
    {
      id: "AMB-102",
      vehicleNumber: "AP 09 CD 5678",
      type: "ALS",
      status: "AVAILABLE",
      driverId: "DRV-502",
      driverName: "Suresh Kumar",
      driverPhone: "+91 98765 43211",
      latitude: 17.4490,
      longitude: 78.3650,
      equipment: ["Ventilator", "Defibrillator", "Oxygen Support", "Trauma Kit"],
      lastUpdated: new Date().toISOString()
    },
    {
      id: "AMB-103",
      vehicleNumber: "AP 09 EF 9012",
      type: "BLS",
      status: "AVAILABLE",
      driverId: "DRV-503",
      driverName: "Ramesh Reddy",
      driverPhone: "+91 98765 43212",
      latitude: 17.4200,
      longitude: 78.4000,
      equipment: ["Basic Life Support", "First Aid", "Stretcher", "O2 Cylinder"],
      lastUpdated: new Date().toISOString()
    },
    {
      id: "AMB-104",
      vehicleNumber: "AP 09 GH 3456",
      type: "ALS",
      status: "OFFLINE",
      driverId: "DRV-504",
      driverName: "Amit Patel",
      driverPhone: "+91 98765 43213",
      latitude: 17.4100,
      longitude: 78.4200,
      equipment: ["Ventilator", "Defibrillator"],
      lastUpdated: new Date().toISOString()
    }
  ],
  hospitals: [
    {
      id: "HOSP-01",
      name: "Apollo Emergency & Trauma Center",
      address: "Jubilee Hills, Road No. 36, Hyderabad",
      latitude: 17.4312,
      longitude: 78.4072,
      phone: "+91 40 2360 7777",
      availableICUBeds: 4,
      erStatus: "READY"
    }
  ],
  dispatches: []
};

// Global Store State
const dbStore = {
  patients: JSON.parse(JSON.stringify(seedData.patients)),
  ambulances: JSON.parse(JSON.stringify(seedData.ambulances)),
  hospitals: JSON.parse(JSON.stringify(seedData.hospitals)),
  dispatches: JSON.parse(JSON.stringify(seedData.dispatches))
};

const resetStore = () => {
  dbStore.patients = JSON.parse(JSON.stringify(seedData.patients));
  dbStore.ambulances = JSON.parse(JSON.stringify(seedData.ambulances));
  dbStore.hospitals = JSON.parse(JSON.stringify(seedData.hospitals));
  dbStore.dispatches = [];
};

module.exports = {
  dbStore,
  resetStore
};
