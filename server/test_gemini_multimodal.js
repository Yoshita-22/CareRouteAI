require('dotenv').config();
const { processMultimodalTriage } = require('./services/geminiClient');

console.log('====================================================');
console.log('🛠️ CARE ROUTE AI — GEMINI MULTIMODAL TRIAGE TEST');
console.log('====================================================\n');

async function testGeminiMultimodal() {
  const sampleInput = {
    text: "Deep leg laceration with potential arterial bleeding, heavy blood loss, patient is dizzy",
    imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", // valid base64 PNG
    patientLocation: { lat: 17.38, lng: 78.48 }
  };

  console.log('Sending sample text, image, and audio inputs to processMultimodalTriage()...');
  
  try {
    const result = await processMultimodalTriage(sampleInput);

    console.log('\n✅ RESULT RETURNED FROM GEMINI MULTIMODAL SERVICE:');
    console.log(JSON.stringify(result, null, 2));

    // Validations
    console.log('\n--- VERIFYING SCHEMA COMPLIANCE ---');
    const requiredKeys = ['urgency_level', 'detected_condition', 'confidence', 'consultation_summary', 'red_flags', 'hard_requirements', 'patient_location'];
    let allValid = true;

    for (const key of requiredKeys) {
      if (result[key] !== undefined) {
        console.log(`✅ Key present: "${key}"`);
      } else {
        console.error(`❌ Key missing: "${key}"`);
        allValid = false;
      }
    }

    if (result.hard_requirements) {
      const hrKeys = ['bed_type', 'equipment', 'specialist'];
      for (const hrKey of hrKeys) {
        if (result.hard_requirements[hrKey] !== undefined) {
          console.log(`✅ Hard requirement key present: "${hrKey}"`);
        } else {
          console.error(`❌ Hard requirement key missing: "${hrKey}"`);
          allValid = false;
        }
      }
    }

    if (allValid) {
      console.log('\n🎉 ALL SCHEMA CHECKS PASSED 100% SUCCESSFULLY!');
    } else {
      console.error('\n❌ SCHEMA VALIDATION FAILED!');
    }
  } catch (err) {
    console.error('❌ ERROR RUNNING TEST:', err);
  }
}

testGeminiMultimodal();
