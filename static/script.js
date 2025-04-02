// ✅ Lấy thông tin người dùng từ localStorage
window.getCurrentUser = function () {
  return {
    user_id: localStorage.getItem("user_id"),
    user_name: localStorage.getItem("user_name"),
    role: localStorage.getItem("role")
  };
};

// ✅ Hiển thị thông báo ra thẻ <p id=...>
window.showMessage = function (id, message, success = true) {
  const p = document.getElementById(id);
  if (!p) return;
  p.textContent = message;
  p.style.color = success ? "green" : "red";
};

// ✅ Gửi POST JSON đúng chuẩn REST API
window.postJSON = async (url, data) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  return res.json();
};

// ✅ Đăng xuất
window.logout = function () {
  localStorage.clear();
  window.location.href = "/login.html";
};

// ✅ 🧠 Hàm dùng chung: bật camera và vẽ bounding box
window.startFaceDetectionOverlay = async function (videoId, overlayId) {
  const video = document.getElementById(videoId);
  const canvas = document.getElementById(overlayId);
  const ctx = canvas.getContext("2d");

  // Tải model
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");

  // Bật camera
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  // Khi video play → bắt đầu vẽ
  video.addEventListener("play", () => {
    const drawLoop = async () => {
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, detections);
      }
      requestAnimationFrame(drawLoop);
    };
    drawLoop();
  });
};

// ✅ ✂️ Hàm dùng chung: crop đúng khuôn mặt từ video
window.captureFaceFromVideo = async function (videoId) {
  const video = document.getElementById(videoId);
  const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
  if (!detection) return null;

  const { x, y, width, height } = detection.box;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, x, y, width, height, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg");
};

// 📝 Đăng ký thông tin người dùng (dùng trong register.html)
const infoForm = document.getElementById("infoForm");
if (infoForm) {
  infoForm.onsubmit = async (e) => {
    e.preventDefault();
    const user_id = document.getElementById("student_id").value.trim();
    const name = document.getElementById("name").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    if (!user_id || !name || !password) {
      showMessage("infoMsg", "⚠ Vui lòng nhập đầy đủ thông tin.", false);
      return;
    }

    const result = await postJSON("/register_info", {
      user_id,
      name,
      password,
      role
    });

    showMessage("infoMsg", result.message, result.success !== false);
  };
}

// 📸 Gửi ảnh khuôn mặt khi đăng ký (dùng trong register.html)
const captureFace = document.getElementById("captureFace");
if (captureFace) {
  captureFace.onclick = async () => {
    const user_id = document.getElementById("student_id").value.trim();
    if (!user_id) {
      showMessage("faceMsg", "⚠ Vui lòng nhập mã người dùng trước.", false);
      return;
    }

    const imageBase64 = await captureFaceFromVideo("camera");
    if (!imageBase64) {
      showMessage("faceMsg", "⚠ Không phát hiện được khuôn mặt!", false);
      return;
    }

    const result = await postJSON("/upload_face", {
      user_id,
      image_data: imageBase64
    });

    showMessage("faceMsg", result.message, result.success !== false);
  };
}
