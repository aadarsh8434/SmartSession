import { useEffect, useRef, useState } from "react";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  const [status, setStatus] = useState("CONNECTING");
  const [history, setHistory] = useState([]);

  // ✅ NEW: track last status to avoid duplicates
  const lastStatusRef = useRef(null);

  useEffect(() => {
    // 🎥 Camera access
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => setStatus("CAMERA BLOCKED"));

    // 🔌 WebSocket connect
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/student");
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("CONNECTED");
    };

    // ✅ FIXED ws.onmessage (DEDUPLICATION LOGIC)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      setStatus(data.status);

      // 🔥 Only add to timeline if status changed
      if (data.status !== lastStatusRef.current) {
        setHistory((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            status: data.status,
          },
          ...prev,
        ]);

        lastStatusRef.current = data.status;
      }
    };

    ws.onerror = () => setStatus("BACKEND ERROR");
    ws.onclose = () => setStatus("DISCONNECTED");

    // 📸 Send frames every 500ms
    intervalRef.current = setInterval(() => {
      if (
        !videoRef.current ||
        !canvasRef.current ||
        ws.readyState !== WebSocket.OPEN
      )
        return;

      const ctx = canvasRef.current.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);

      const img = canvasRef.current
        .toDataURL("image/jpeg")
        .split(",")[1];

      ws.send(img);
    }, 500);

    return () => {
      clearInterval(intervalRef.current);
      ws.close();
    };
  }, []);

  // 🎨 Badge color
  const badgeColor =
    status === "FOCUSED"
      ? "#2ecc71"
      : status === "CONFUSED"
      ? "#f1c40f"
      : "#e74c3c";

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>🎓 SmartSession – Unified Dashboard</h1>

      {/* STUDENT CAMERA */}
      <h2>👨‍🎓 Student View</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        width="320"
        height="240"
        style={{ border: "2px solid black" }}
      />
      <canvas
        ref={canvasRef}
        width="320"
        height="240"
        style={{ display: "none" }}
      />

      {/* TEACHER PANEL */}
      <h2 style={{ marginTop: "30px" }}>👩‍🏫 Teacher Panel</h2>

      <div
        style={{
          background: badgeColor,
          color: "white",
          padding: "14px 28px",
          display: "inline-block",
          borderRadius: "30px",
          fontSize: "16px",
          fontWeight: "600",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          marginBottom: "20px",
        }}
      >
        {status}
      </div>

      {/* TIMELINE */}
      <h3>📊 Session Timeline</h3>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "15px",
          width: "350px",
          maxHeight: "250px",
          overflowY: "auto",
        }}
      >
        {history.length === 0 ? (
          <p>No activity yet</p>
        ) : (
          history.map((item, i) => (
            <div
              key={i}
              style={{
                padding: "6px 0",
                borderBottom: "1px dashed #ddd",
                fontSize: "14px",
              }}
            >
              <b>{item.time}</b> — <span>{item.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
