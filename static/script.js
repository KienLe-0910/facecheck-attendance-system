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

// ✅ Hàm dùng chung: khởi tạo camera + overlay oval
window.initCameraWithOverlay = async function (videoId, overlayId) {
  const video = document.getElementById(videoId);
  const overlay = document.getElementById(overlayId);

  if (!video || !overlay) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (err) {
    console.error("🚫 Không thể truy cập webcam:", err);
    return;
  }

  const ctx = overlay.getContext("2d");

  function drawOval() {
    if (video.readyState >= 2) {
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;

      ctx.clearRect(0, 0, overlay.width, overlay.height);

      const centerX = overlay.width / 2;
      const centerY = overlay.height / 2;
      const radiusX = overlay.width / 5;
      const radiusY = overlay.height / 3;

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    requestAnimationFrame(drawOval);
  }

  drawOval();
};

// ✅ Hàm dùng chung: chụp ảnh từ camera
window.captureImageFromVideo = function (videoId) {
  const video = document.getElementById(videoId);
  if (!video || video.readyState < 2) return null;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
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

    const imageBase64 = captureImageFromVideo("camera");
    if (!imageBase64) {
      showMessage("faceMsg", "⚠ Chưa sẵn sàng chụp ảnh!", false);
      return;
    }

    const result = await postJSON("/upload_face", {
      user_id,
      image_data: imageBase64
    });

    showMessage("faceMsg", result.message, result.success !== false);
  };
}
