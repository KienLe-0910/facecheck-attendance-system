// ✅ Lấy thông tin người dùng từ localStorage
window.getCurrentUser = function () {
  return {
    user_id: localStorage.getItem("user_id"),
    user_name: localStorage.getItem("user_name"),
    role: localStorage.getItem("role")
  };
};

// ✅ Hiển thị thông báo ra <p id=...>
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
};

// ✅ Đăng xuất
window.logout = function () {
  localStorage.clear();
  window.location.href = "/login.html";
};

// ✅ Bật camera + vẽ bounding box khuôn mặt (cho attendance, register)
window.startFaceDetectionOverlay = async function (videoId, canvasId) {
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
};

// ✅ Chụp ảnh từ video, chỉ vùng khuôn mặt
window.captureFaceFromVideo = async function (videoId) {
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
};

// ✅ Đăng ký người dùng (register.html)
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

// 📸 Gửi ảnh khuôn mặt khi đăng ký (register.html)
const captureBtn = document.getElementById("captureFace");
if (captureBtn) {
  captureBtn.onclick = async () => {
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
      student_id: user_id,
      image_data: imageBase64
    });

    showMessage("faceMsg", result.message, result.success !== false);
  };
}

// 🔐 Đăng nhập (login.html)
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const user_id = document.getElementById("user_id").value.trim();
    const password = document.getElementById("password").value;

    if (!user_id || !password) {
      showMessage("loginMsg", "⚠ Vui lòng nhập đầy đủ thông tin.", false);
      return;
    }

    const res = await postJSON("/login", { user_id, password });
    if (res.success) {
      localStorage.setItem("user_id", res.data.user_id);
      localStorage.setItem("user_name", res.data.name);
      localStorage.setItem("role", res.data.role);
      window.location.href = res.data.role === "teacher" ? "/teacher.html" : "/student.html";
    } else {
      showMessage("loginMsg", res.message || "❌ Đăng nhập thất bại", false);
    }
  };
}

// 📚 Xem lớp đã đăng ký (student.html)
window.viewRegisteredClasses = async function () {
  const { user_id } = getCurrentUser();
  const res = await fetch(`/get_student_classes?user_id=${user_id}`);
  const result = await res.json();
  const area = document.getElementById("infoArea");

  if (result.success) {
    if (result.data.length === 0) {
      area.innerHTML = "<p>Bạn chưa đăng ký lớp học phần nào.</p>";
    } else {
      const html = result.data.map(cls => `
        <div>
          <strong>${cls.class_id}</strong> - ${cls.class_name}
          <button onclick="unenrollClass('${cls.class_id}')">❌ Huỷ</button>
        </div>
      `).join("");
      area.innerHTML = `<h3>📚 Lớp đã đăng ký:</h3>` + html;
    }
  } else {
    area.innerHTML = `<p style="color:red;">${result.message}</p>`;
  }
};

// 🕒 Xem lịch sử điểm danh (student.html)
window.viewAttendanceHistory = async function () {
  const classId = prompt("Nhập mã lớp học phần để xem lịch sử:");
  const { user_id } = getCurrentUser();
  if (!classId) return;

  const res = await fetch(`/student_attendance_history?user_id=${user_id}&class_id=${classId}`);
  const result = await res.json();
  const area = document.getElementById("infoArea");

  if (result.success) {
    if (result.data.length === 0) {
      area.innerHTML = `<p>Chưa có lịch sử điểm danh trong lớp <strong>${classId}</strong>.</p>`;
    } else {
      const html = result.data.map(r => `<li>🕓 <strong>${r.timestamp}</strong> — <em>${r.status}</em></li>`).join("");
      area.innerHTML = `<h3>🕒 Lịch sử điểm danh lớp <strong>${classId}</strong>:</h3><ul>${html}</ul>`;
    }
  } else {
    area.innerHTML = `<p style="color:red;">${result.message}</p>`;
  }
};

// ❌ Huỷ đăng ký lớp học phần
window.unenrollClass = async function (classId) {
  const { user_id } = getCurrentUser();
  if (!confirm(`Bạn có chắc chắn muốn huỷ đăng ký lớp ${classId}?`)) return;

  const res = await fetch(`/unenroll_class?user_id=${user_id}&class_id=${classId}`, {
    method: "DELETE"
  });

  const result = await res.json();
  alert(result.message);
  if (result.success) viewRegisteredClasses();
};
