const getCurrentUser = () => ({
  user_id: localStorage.getItem("user_id"),
  role: localStorage.getItem("role"),
});

const showMessage = (id, message, success = true) => {
  const p = document.getElementById(id);
  p.textContent = message;
  p.style.color = success ? "green" : "red";
};

const postJSON = async (url, data) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
};

async function startFaceDetection(videoId, canvasId) {
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");

  const video = document.getElementById(videoId);
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  video.addEventListener("loadedmetadata", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

    video.addEventListener("play", () => {
      const loop = async () => {
        const detections = await faceapi.detectAllFaces(video, options);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        detections.forEach(det => {
          const { x, y, width, height } = det.box;
          ctx.beginPath();
          ctx.strokeStyle = "lime";
          ctx.lineWidth = 3;
          ctx.rect(x, y, width, height);
          ctx.stroke();
        });
        requestAnimationFrame(loop);
      };
      loop();
    });
  });
}

async function captureFace(videoId) {
  const video = document.getElementById(videoId);
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const detection = await faceapi.detectSingleFace(video, options);
  if (!detection) return null;

  const { x, y, width, height } = detection.box;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, x, y, width, height, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg");
}

window.onload = async () => {
  const { user_id, role } = getCurrentUser();
  if (!user_id || role !== "student") {
    alert("Bạn chưa đăng nhập với tư cách sinh viên!");
    window.location.href = "/login.html";
    return;
  }

  await startFaceDetection("video", "overlay");

  let imageData = "";

  document.getElementById("captureBtn").onclick = async () => {
    const result = await captureFace("video");
    if (!result) {
      showMessage("msg", "⚠️ Không phát hiện được khuôn mặt!", false);
      return;
    }
    imageData = result;
    showMessage("msg", "✅ Đã chụp ảnh khuôn mặt!", true);
  };

  document.getElementById("attendanceForm").onsubmit = async (e) => {
    e.preventDefault();
    if (!imageData) {
      showMessage("msg", "⚠️ Vui lòng chụp ảnh trước!", false);
      return;
    }

    const session_id = document.getElementById("session_id").value;
    const result = await postJSON("/attendance", {
      user_id,
      session_id,
      image_data: imageData
    });

    showMessage("msg", result.message || result.detail, result.success !== false);
  };

  const res = await fetch(`/get_available_sessions?user_id=${user_id}`);
  const result = await res.json();
  const select = document.getElementById("session_id");

  if (result.success && result.data.length > 0) {
    result.data.forEach(session => {
      const opt = document.createElement("option");
      opt.value = session.session_id;
      opt.textContent = `${session.class_name} (${session.start_time} - ${session.end_time})`;
      select.appendChild(opt);
    });
  } else {
    showMessage("msg", "⚠️ Không có phiên điểm danh khả dụng!", false);
    document.getElementById("attendanceForm").style.display = "none";
  }
};
