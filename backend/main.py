from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import cv2
import base64
import numpy as np
import time
import mediapipe as mp
from collections import deque

app = FastAPI()

# -------------------------
# MediaPipe setup
# -------------------------
mp_face = mp.solutions.face_detection
face_detector = mp_face.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.6
)

mp_mesh = mp.solutions.face_mesh
face_mesh = mp_mesh.FaceMesh(refine_landmarks=True)

LOOK_AWAY_THRESHOLD = 4.0
CONFUSION_TIME = 2.5

# -------------------------
# Session Timeline (last 50 events)
# -------------------------
status_history = deque(maxlen=50)


@app.get("/")
def home():
    return {"message": "SmartSession backend running"}


@app.websocket("/ws/student")
async def student_ws(ws: WebSocket):
    await ws.accept()

    look_away_start = None
    confusion_start = None

    try:
        while True:
            data = await ws.receive_text()

            # ---------- Decode frame ----------
            frame = cv2.imdecode(
                np.frombuffer(base64.b64decode(data), np.uint8),
                cv2.IMREAD_COLOR
            )

            if frame is None:
                send_status(ws, "NO_FRAME")
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # ---------- Face Detection ----------
            fd = face_detector.process(rgb)

            if not fd.detections:
                send_status(ws, "PROCTOR_ALERT", "NO_FACE")
                continue

            if len(fd.detections) > 1:
                send_status(ws, "PROCTOR_ALERT", "MULTIPLE_FACES")
                continue

            # ---------- Face Mesh ----------
            fm = face_mesh.process(rgb)
            if not fm.multi_face_landmarks:
                send_status(ws, "FOCUSED")
                continue

            lm = fm.multi_face_landmarks[0].landmark

            # ---------- Gaze Detection ----------
            gaze = "CENTER"
            nose = lm[1]
            left_eye = lm[33]
            right_eye = lm[263]

            if nose.x < left_eye.x - 0.02:
                gaze = "LEFT"
            elif nose.x > right_eye.x + 0.02:
                gaze = "RIGHT"

            now = time.time()

            if gaze != "CENTER":
                if look_away_start is None:
                    look_away_start = now
                elif now - look_away_start >= LOOK_AWAY_THRESHOLD:
                    send_status(ws, "PROCTOR_ALERT", f"LOOK_{gaze}")
                    continue
            else:
                look_away_start = None

            # ---------- Confusion Detection ----------
            confusion_score = 0

            if abs(lm[65].x - lm[295].x) < 0.18:
                confusion_score += 1

            if abs(lm[61].x - lm[291].x) < 0.35:
                confusion_score += 1

            if abs(lm[1].x - 0.5) > 0.05:
                confusion_score += 1

            if confusion_score >= 2:
                if confusion_start is None:
                    confusion_start = now
                elif now - confusion_start >= CONFUSION_TIME:
                    send_status(ws, "CONFUSED")
                    continue
            else:
                confusion_start = None

            # ---------- Default ----------
            send_status(ws, "FOCUSED", gaze)

    except WebSocketDisconnect:
        print("Student disconnected")


# -------------------------
# Helper function
# -------------------------
def send_status(ws: WebSocket, status: str, reason: str | None = None):
    entry = {
        "status": status,
        "time": time.strftime("%H:%M:%S")
    }
    if reason:
        entry["reason"] = reason

    status_history.append(entry)

    payload = {
        "status": status,
        "reason": reason,
        "history": list(status_history)
    }

    import asyncio
    asyncio.create_task(ws.send_json(payload))
