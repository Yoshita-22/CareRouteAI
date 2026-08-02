# 🚑 CareRoute AI
### Intelligent Emergency Dispatch & Hospital Coordination Platform

### Deployment Link :
https://care-route-ai-acbk.vercel.app/


CareRoute AI is an AI-powered emergency response platform that minimizes the time between incident reporting and definitive medical care. It intelligently analyzes emergency cases, prioritizes patients based on severity, and assists in coordinating hospitals, emergency responders, and real-time communication.

---

## 📌 Problem Statement

During medical emergencies, valuable time is often lost due to:
- Delayed emergency assessment
- Manual hospital coordination
- Lack of real-time communication
- Difficulty locating available healthcare resources

These delays can significantly reduce survival chances during the critical **Golden Hour**.

---

## 💡 Solution

CareRoute AI automates emergency response by combining AI, real-time communication, and hospital coordination into a single platform.

The system enables:
- AI-assisted emergency triage
- Intelligent hospital routing
- Live communication between stakeholders
- Real-time emergency monitoring

---

# ✨ Features

### 👤 Patient Portal
- Emergency registration
- AI-assisted symptom reporting
- Case tracking
- Live emergency updates

### 🏥 Hospital Dashboard
- View incoming emergency cases
- Patient prioritization
- Case management
- Real-time notifications

### 🚑 Emergency Coordination
- AI severity assessment
- Emergency routing
- Hospital allocation
- Live communication

### 🤖 AI Features
- Google Gemini powered emergency analysis
- Intelligent triage assistance
- Context-aware recommendations

### 🔐 Authentication
- Secure user authentication
- Role-based access
- Session management

---

# 🛠 Tech Stack

## Frontend
- React.js
- Vite
- Tailwind CSS
- React Leaflet
- Socket.IO Client

## Backend
- Node.js
- Express.js
- Socket.IO
- MongoDB (Mongoose)

## AI
- Google Gemini API

## Authentication
- Supabase Authentication

---

# 📂 Project Structure

```
CareRouteAI/
│
├── client/            # React Frontend
│
├── server/            # Express Backend
│
├── my-agent/          # AI Agent
│
└── README.md
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/CareRouteAI.git

cd CareRouteAI
```

---

## Backend Setup

```bash
cd server

npm install

npm run dev
```

---

## Frontend Setup

```bash
cd client

npm install

npm run dev
```

---

# 🔑 Environment Variables

Create a `.env` file inside the `server` folder.

```env
PORT=5000

MONGODB_URI=your_mongodb_connection

SUPABASE_URL=your_supabase_url

SUPABASE_ANON_KEY=your_supabase_key

GEMINI_API_KEY=your_gemini_api_key
```

---

# 🚀 Deployment

## Frontend
- Vercel

## Backend
- Render

---

# 📸 Screenshots

Add screenshots here.

```
Home Page

Dashboard

Emergency Monitoring

Hospital Portal
```

---

# 🔄 Workflow

```
Patient
      │
      ▼
Emergency Report
      │
      ▼
AI Emergency Analysis
      │
      ▼
Severity Classification
      │
      ▼
Hospital Dashboard
      │
      ▼
Emergency Response
      │
      ▼
Patient Tracking
```

---

# 🎯 Future Enhancements

- Voice-based emergency reporting
- Live ambulance tracking
- ICU bed availability prediction
- Blood bank integration
- Multi-language support
- Offline emergency mode

---

# 🤝 Contributors

- Yoshita Lakshmi
- Team Members

---

# 📄 License

This project is licensed under the MIT License.

---

# ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.
