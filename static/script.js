// =============================
// ✅ Các hàm tiện ích dùng chung (global)
// =============================

window.getCurrentUser = function () {
  return {
    user_id: localStorage.getItem("user_id"),
    user_name: localStorage.getItem("user_name"),
    role: localStorage.getItem("role")
  };
};

window.showMessage = function (id, message, success = true) {
  const p = document.getElementById(id);
  if (!p) return;
  p.textContent = message;
  p.style.color = success ? "green" : "red";
};

window.postJSON = async (url, data) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
};

window.logout = function () {
  localStorage.clear();
  window.location.href = "/login.html";
};

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


// =============================
// ✅ Xử lý logic theo từng trang cụ thể
// =============================

// Login
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

    try {
      const res = await postJSON("/login", { user_id, password });

      if (res.success) {
        localStorage.setItem("user_id", res.user_id);
        localStorage.setItem("user_name", res.user_name);
        localStorage.setItem("role", res.role);

        showMessage("loginMsg", res.message || "✅ Đăng nhập thành công!", true);
        const dashboard = res.role === "teacher"
          ? "/teacher.html"
          : res.role === "admin"
          ? "/admin.html"
          : "/student.html";
        setTimeout(() => window.location.href = dashboard, 1000);
      } else {
        showMessage("loginMsg", res.message || "❌ Đăng nhập thất bại!", false);
      }
    } catch (err) {
      showMessage("loginMsg", "❌ Lỗi kết nối đến server!", false);
      console.error(err);
    }
  };
}

// Register
const infoForm = document.getElementById("infoForm");
if (infoForm) {
  infoForm.onsubmit = async (e) => {
    e.preventDefault();
    const student_id = document.getElementById("student_id").value.trim();
    const name = document.getElementById("name").value.trim();
    const password = document.getElementById("password").value;

    if (!student_id || !name || !password) {
      showMessage("infoMsg", "⚠ Vui lòng nhập đầy đủ thông tin.", false);
      return;
    }

    const result = await postJSON("/register_info", {
      student_id,
      name,
      password
    });

    showMessage("infoMsg", result.message, result.success !== false);
  };
}

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

    // ✅ Hiển thị ảnh vừa gửi (sau khi thành công)
    if (result.success) {
      const img = document.getElementById("previewImage");
      if (img) {
        img.src = imageBase64;
        img.style.display = "block";
      }
    }
  };
}

// Admin
const teacherForm = document.getElementById("create-teacher-form");
if (teacherForm) {
  const { user_name, role } = getCurrentUser();
  if (role !== "admin") {
    window.location.href = "/login.html";
  }

  document.getElementById("admin-name").textContent = user_name || "Admin";

  teacherForm.onsubmit = async (e) => {
    e.preventDefault();

    const user_id = document.getElementById("user_id").value.trim();
    const name = document.getElementById("name").value.trim();
    const password = document.getElementById("password").value;

    if (!user_id || !name || !password) {
      showMessage("message", "⚠ Vui lòng nhập đầy đủ thông tin.", false);
      return;
    }

    const res = await postJSON("/admin/create_teacher", { user_id, name, password });
    showMessage("message", res.message || res.detail, res.success !== false);
    if (res.success) teacherForm.reset();
  };
  
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.onclick = logout;
}

const teachersList = document.getElementById("teachers-list");
const loadBtn = document.getElementById("load-teachers");

if (loadBtn) {
  loadBtn.onclick = async () => {
    teachersList.innerHTML = "⏳ Đang tải...";
    const res = await fetch("/admin/teachers");
    const data = await res.json();

    if (!data.success || !data.data.length) {
      teachersList.innerHTML = "<p>⚠ Không có giảng viên nào.</p>";
      return;
    }

    // Render danh sách giảng viên
    const html = data.data.map(teacher => `
      <div style="margin-bottom: 10px;">
        <strong>${teacher.name}</strong> (${teacher.user_id}) - ${teacher.created_at}
        <button onclick="viewClassesOfTeacher('${teacher.user_id}')">📦 Xem lớp</button>
        <div id="classes-${teacher.user_id}" style="margin-left: 20px;"></div>
      </div>
    `).join("");

    teachersList.innerHTML = html;
  };
}

// ✅ Hàm xem lớp học phần của 1 giảng viên
window.viewClassesOfTeacher = async function (teacher_id) {
  const container = document.getElementById(`classes-${teacher_id}`);
  if (!container) return;

  container.innerHTML = "⏳ Đang tải lớp...";

  const res = await fetch(`/admin/classes_of_teacher?teacher_id=${teacher_id}`);
  const data = await res.json();

  if (!data.success || !data.data.length) {
    container.innerHTML = "<p>Không có lớp học phần nào.</p>";
    return;
  }

  const html = data.data.map(cls => `
    <div>📘 <strong>${cls.class_name}</strong> (${cls.class_id}) - ${cls.created_at}</div>
  `).join("");
  container.innerHTML = html;
};

// ✅ Tự động bật camera nếu có phần tử "camera" và "overlay" trong trang
window.addEventListener("DOMContentLoaded", async () => {
  const video = document.getElementById("camera");
  const canvas = document.getElementById("overlay");

  if (video && canvas) {
    try {
      await startFaceDetectionOverlay("camera", "overlay");
      console.log("[INFO] ✅ Camera đã sẵn sàng.");
    } catch (err) {
      console.error("[ERROR] Lỗi bật camera:", err);
      showMessage("faceMsg", "🚫 Không thể truy cập webcam.", false);
    }
  }
});
