# 🎓 SmartSession

SmartSession is a real-time student engagement and proctoring dashboard built using **React**, **FastAPI**, and **WebSockets**.

## 🚀 Features
- Live student webcam streaming
- Real-time status detection (Focused / Confused / Alerts)
- Unified teacher dashboard with timeline
- Low-latency WebSocket communication
- Clean, explainable logic (no black-box AI)

## 🛠 Tech Stack
- Frontend: React + Vite
- Backend: FastAPI + WebSockets
- Video Processing: OpenCV (MediaPipe ready)

## ▶ Run Backend
```bash
cd backend
venv\Scripts\activate
pip install fastapi uvicorn
uvicorn main:app --reload

▶ Run Frontend
cd frontend/student
npm install
npm run dev

## Access Application

- Frontend: http://localhost:5173
- Backend: http://127.0.0.1:8000

**Status Meaning

Green: Focused
Yellow: Confused
Red: Alert / Disconnected

## Use Case

SmartSession can be used for online classrooms, live lectures, and remote assessments where real-time student focus and activity monitoring is required.

## Summary

This project demonstrates real-time communication, clean frontend–backend separation, and an explainable approach to student engagement monitoring using WebSockets.
