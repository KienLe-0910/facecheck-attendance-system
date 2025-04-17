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

// =============================
// ✅ Khởi tạo sau khi DOM sẵn sàng (KHÔNG tự bật camera)
// =============================
window.addEventListener("DOMContentLoaded", async () => {
  // ✅ 1. Cảnh báo Caps Lock cho input password
  const passwordInputs = document.querySelectorAll("input[type='password']");
  passwordInputs.forEach(input => {
    const warning = document.createElement("p");
    warning.style.color = "orange";
    warning.style.fontSize = "0.9em";
    warning.style.marginTop = "0.3rem";
    warning.textContent = "⚠️ Caps Lock đang bật!";
    warning.style.display = "none";
    input.insertAdjacentElement("afterend", warning);

    input.addEventListener("keydown", (e) => {
      warning.style.display = e.getModifierState("CapsLock") ? "block" : "none";
    });

    input.addEventListener("blur", () => {
      warning.style.display = "none";
    });
  });

  // ✅ 2. Reset lại flow motion nếu có nút
  const resetBtn = document.getElementById("resetCaptureBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const video = document.getElementById("camera");
      const stream = video?.srcObject;
      if (stream) stream.getTracks().forEach(track => track.stop());

      ["front", "left", "right"].forEach(pos => {
        const img = document.getElementById(`preview_${pos}`);
        if (img) img.src = "";
      });

      window.motionImages = {};
      startMotionFaceCapture("camera", "overlay");
    });
  }

  // ✅ 3. Nếu đang ở trang attendance.html thì load danh sách phiên
  if (window.location.pathname.endsWith("attendance.html")) {
    const { user_id, role } = getCurrentUser();
    if (!user_id || role !== "student") {
      alert("Bạn chưa đăng nhập với tư cách sinh viên!");
      window.location.href = "/login.html";
      return;
    }

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
      document.getElementById("attendanceForm")?.style?.setProperty("display", "none");
    }
  }
});



// =============================
// ✅ Quét khuôn mặt 3 góc (front, left, right)
// =============================
window.startMotionFaceCapture = async function (videoId, canvasId) {
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  await faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models");

  const video = document.getElementById(videoId);
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const msgEl = document.getElementById("faceStepMsg");

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  video.addEventListener("loadedmetadata", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  });

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const steps = ["front", "left", "right"];
  const images = {};
  let currentStep = 0;
  let captureCooldown = 0;

  let readyFrames = 0;
  const REQUIRED_FRAMES = 35; // ~2 giây nếu 60fps

  const loop = async () => {
    const detections = await faceapi
      .detectAllFaces(video, options)
      .withFaceLandmarks(true);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length === 1) {
      const det = detections[0];
      const box = det.detection.box;
      const landmarks = det.landmarks;

      ctx.strokeStyle = "lime";
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      const noseX = landmarks.getNose()[3].x;
      const eyeL = landmarks.getLeftEye()[0].x;
      const eyeR = landmarks.getRightEye()[3].x;
      const eyesMidX = (eyeL + eyeR) / 2;
      const offset = noseX - eyesMidX;

      const expected = steps[currentStep];
      let ok = false;

      if (expected === "front" && Math.abs(offset) < 10) ok = true;
      if (expected === "left" && offset < -20) ok = true;
      if (expected === "right" && offset > 20) ok = true;

      if (ok) {
        readyFrames++;
        if (msgEl) {
          msgEl.textContent = `👉 Bước ${currentStep + 1}/3: ${expected.toUpperCase()} ✅ (${readyFrames}/${REQUIRED_FRAMES})`;
        }

        if (readyFrames >= REQUIRED_FRAMES && captureCooldown === 0) {
          const cropCanvas = document.createElement("canvas");
          cropCanvas.width = box.width;
          cropCanvas.height = box.height;
          const cropCtx = cropCanvas.getContext("2d");
          cropCtx.drawImage(
            video,
            box.x,
            box.y,
            box.width,
            box.height,
            0,
            0,
            box.width,
            box.height
          );

          images[expected] = cropCanvas.toDataURL("image/jpeg");

          const imgEl = document.getElementById(`preview_${expected}`);
          if (imgEl) imgEl.src = images[expected];

          currentStep++;
          captureCooldown = 60;
          readyFrames = 0;

          if (currentStep >= steps.length) {
            if (msgEl) msgEl.textContent = "✅ Đã hoàn tất chụp 3 góc!";
            video.pause();
            stream.getTracks().forEach(t => t.stop());
            window.motionImages = images;
            return;
          }
        }
      } else {
        readyFrames = 0;
        if (msgEl)
          msgEl.textContent = `👉 Bước ${currentStep + 1}/3: ${expected.toUpperCase()} ❌`;
      }
    } else {
      readyFrames = 0;
      if (msgEl)
        msgEl.textContent = "⚠️ Vui lòng để đúng 1 khuôn mặt trong khung hình";
    }

    if (captureCooldown > 0) captureCooldown--;
    requestAnimationFrame(loop);
  };

  video.addEventListener("playing", () => {
    loop();
  });
};


// GỬI LÊN BACKEND
window.submitMotionRegister = async function () {
  const user_id = document.getElementById("student_id")?.value.trim();
  const name = document.getElementById("name")?.value.trim();
  const password = document.getElementById("password")?.value;
  const phone_number = document.getElementById("phone_number")?.value.trim();
  const msg = document.getElementById("msg");

  if (!user_id || !name || !password || !phone_number) {
    showMessage("msg", "⚠️ Vui lòng nhập đầy đủ thông tin!", false);
    return;
  }

  if (!window.motionImages || !window.motionImages.front || !window.motionImages.left || !window.motionImages.right) {
    showMessage("msg", "⚠️ Bạn chưa hoàn tất đăng ký khuôn mặt 3 hướng!", false);
    return;
  }

  const data = {
    user_id,
    name,
    password,
    phone_number,
    role: "student",
    image_front: window.motionImages.front,
    image_left: window.motionImages.left,
    image_right: window.motionImages.right
  };

  try {
    const res = await postJSON("/register", data);
    if (res.success) {
      showMessage("msg", res.message || "✅ Đăng ký thành công!", true);
      setTimeout(() => window.location.href = "/login.html", 2000);
    } else {
      showMessage("msg", res.message || "❌ Lỗi đăng ký!", false);
    }
  } catch (err) {
    showMessage("msg", "❌ Lỗi kết nối server!", false);
    console.error(err);
  }
};

// ✅ Gửi điểm danh bằng 3 ảnh
window.submitMotionAttendance = async function () {
  const { user_id } = getCurrentUser();
  const session_id = document.getElementById("session_id")?.value;

  if (!user_id || !session_id) {
    showMessage("msg", "⚠️ Thiếu thông tin người dùng hoặc phiên.", false);
    return;
  }

  if (!window.motionImages || !window.motionImages.front || !window.motionImages.left || !window.motionImages.right) {
    showMessage("msg", "⚠️ Bạn chưa hoàn tất quét đủ 3 ảnh khuôn mặt!", false);
    return;
  }

  const data = {
    user_id,
    session_id,
    image_front: window.motionImages.front,
    image_left: window.motionImages.left,
    image_right: window.motionImages.right
  };

  try {
    const res = await postJSON("/attendance", data);
    showMessage("msg", res.message || "❌ Lỗi khi điểm danh!", res.success !== false);
  } catch (err) {
    showMessage("msg", "❌ Lỗi kết nối server!", false);
    console.error(err);
  }
};



// Xem lớp học phần đã đăng ký
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
// ✅ Xử lý login
// =============================
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

// =============================
// ✅ Đăng ký tài khoản (register.html)
// =============================


// =============================
// ✅ Quản lý admin (admin.html)
// =============================
const teacherForm = document.getElementById("create-teacher-form");
const tableBody = document.getElementById("teacher-table-body");
const loadBtn = document.getElementById("load-teachers");

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
    const phone_number = document.getElementById("phone_number").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
  
    if (!user_id || !name || !phone_number || !email || !password) {
      showMessage("message", "⚠ Vui lòng nhập đầy đủ thông tin.", false);
      return;
    }
  
    const res = await postJSON("/admin/create_teacher", {
      user_id,
      name,
      phone_number,
      email,
      password
    });
  
    showMessage("message", res.message || res.detail, res.success !== false);
    if (res.success) {
      teacherForm.reset();
      if (loadBtn) loadBtn.click(); // reload danh sách
    }
  };
}

// =============================
// ✅ Tải danh sách giảng viên
// =============================
if (loadBtn && tableBody) {
  loadBtn.onclick = async () => {
    tableBody.innerHTML = `<tr><td colspan="5">⏳ Đang tải...</td></tr>`;

    const res = await fetch("/admin/teachers");
    const data = await res.json();

    if (!data.success || !data.data.length) {
      tableBody.innerHTML = `<tr><td colspan="5">⚠ Không có giảng viên nào.</td></tr>`;
      return;
    }

    tableBody.innerHTML = ""; // Clear bảng cũ

    data.data.forEach(teacher => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${teacher.user_id}</td>
        <td>${teacher.name}</td>
        <td>${teacher.phone_number || ""}</td>
        <td>${teacher.email || ""}</td>
        <td>${new Date(teacher.created_at).toLocaleDateString("vi-VN")}</td>
        <td>
          <button onclick="viewClassesOfTeacher('${teacher.user_id}')">📦 Xem lớp</button>
          <div id="classes-${teacher.user_id}" style="margin-top: 5px;"></div>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  };
}

// =============================
// ✅ Xem lớp học phần của giảng viên
// =============================
window.viewClassesOfTeacher = async function (teacher_id) {
  const container = document.getElementById(`classes-${teacher_id}`);
  if (!container) return;

  container.innerHTML = "⏳ Đang tải lớp...";

  const res = await fetch(`/admin/classes_of_teacher?teacher_id=${teacher_id}`);
  const data = await res.json();

  if (!data.success || !data.data.length) {
    container.innerHTML = "<em>Không có lớp học phần nào.</em>";
    return;
  }

  const html = data.data.map(cls => `
    <div>📘 <strong>${cls.class_name}</strong> (${cls.class_id}) – ${new Date(cls.created_at).toLocaleDateString("vi-VN")}</div>
  `).join("");
  container.innerHTML = html;
};


// ✅ Logic riêng cho trang teacher.html
if (window.location.pathname.endsWith("teacher.html")) {
  const { user_id, user_name, role } = getCurrentUser();

  if (!user_id || role !== "teacher") {
    window.location.href = "/login.html";
  }

  if (user_name) {
    document.getElementById("teacherName").textContent = user_name;
  }

  let allClasses = [];

  // Tạo lớp học phần
  document.getElementById("createClassForm").onsubmit = async (e) => {
    e.preventDefault();
    const class_id = document.getElementById("class_id").value.trim();
    const class_name = document.getElementById("class_name").value.trim();

    const res = await fetch(`/create_class?class_id=${class_id}&class_name=${encodeURIComponent(class_name)}&teacher_id=${user_id}`, {
      method: "POST"
    });

    const result = await res.json();
    showMessage("createMsg", result.message || result.detail, result.success !== false);

    if (result.success) {
      document.getElementById("createClassForm").reset();
      loadClasses();
    }
  };

  // Hiển thị danh sách lớp học phần dạng card thông minh
  window.loadClasses = async function () {
    const res = await fetch(`/get_classes_by_teacher?teacher_id=${user_id}`);
    const result = await res.json();
    const div = document.getElementById("classList");

    if (result.success) {
      allClasses = result.data;
      div.innerHTML = result.data.map(cls => `
        <div class="class-card">
          <div class="class-header">
            <div>
              <h3>📘 ${cls.class_name}</h3>
              <p><strong>Mã lớp:</strong> ${cls.class_id} | <strong>Ngày tạo:</strong> ${cls.created_at}</p>
            </div>
            <div class="class-actions">
              <button onclick="showSessionForm('${cls.class_id}')">➕ Tạo phiên</button>
              <button onclick="loadSessions('${cls.class_id}')">📜 Xem phiên</button>
              <button onclick="viewStudents('${cls.class_id}')">👨‍🎓 Xem SV</button>
              <button onclick="editClass('${cls.class_id}')">✏️ Sửa</button>
              <button onclick="deleteClass('${cls.class_id}')">❌ Xoá</button>
            </div>
          </div>

          <div class="create-session-form" id="session-form-${cls.class_id}" style="display:none; margin-top:10px;">
            <input type="datetime-local" class="start" required />
            <input type="datetime-local" class="end" required />
            <button onclick="submitSession('${cls.class_id}')">✅ Tạo</button>
            <p class="session-msg"></p>
          </div>

          <div class="session-list" id="session-list-${cls.class_id}" style="margin-top: 1rem;"></div>
          <div class="student-list" id="student-list-${cls.class_id}" style="margin-top: 1rem;"></div>
        </div>
      `).join("");

      updateClassDropdown(allClasses);
    } else {
      div.innerHTML = `<p style="color:red;">${result.message}</p>`;
    }
  }

  window.showSessionForm = function (class_id) {
    const form = document.getElementById(`session-form-${class_id}`);
    if (form) form.style.display = (form.style.display === "none") ? "block" : "none";
  }

  window.submitSession = async function (class_id) {
    const form = document.getElementById(`session-form-${class_id}`);
    const startInput = form.querySelector(".start");
    const endInput = form.querySelector(".end");
    const msg = form.querySelector(".session-msg");

    const start_time = startInput.value;
    const end_time = endInput.value;
    if (!start_time || !end_time) {
      msg.textContent = "⚠️ Vui lòng nhập đủ thời gian!";
      return;
    }

    const res = await postJSON("/create_session", { class_id, start_time, end_time });
    msg.textContent = res.message || (res.success ? "✅ Tạo phiên thành công" : "❌ Lỗi");
    if (res.success) {
      startInput.value = "";
      endInput.value = "";
      loadSessions(class_id);
    }
  }

  window.loadSessions = async function (class_id) {
    // Ẩn tất cả danh sách sinh viên đang hiển thị
    document.querySelectorAll(".student-list").forEach(el => el.innerHTML = "");
    document.querySelectorAll(".session-list").forEach(el => el.innerHTML = "");
  
    const list = document.getElementById(`session-list-${class_id}`);
    if (!list) return;
    list.innerHTML = "⏳ Đang tải...";
  
    const res = await fetch(`/get_sessions?class_id=${class_id}`);
    const result = await res.json();
  
    if (!result.success || !result.data.length) {
      list.innerHTML = "<p>⚠ Chưa có phiên nào.</p>";
      return;
    }
  
    list.innerHTML = "<ul>" + result.data.map(s => `
      <li>🕒 ${s.start_time} → ${s.end_time}</li>
    `).join("") + "</ul>";
  };
  

  window.viewStudents = async function (class_id) {
    // Ẩn tất cả các vùng session-list khác
    document.querySelectorAll(".session-list").forEach(el => el.innerHTML = "");
    document.querySelectorAll(".student-list").forEach(el => el.innerHTML = "");
  
    const list = document.getElementById(`student-list-${class_id}`);
    if (!list) return;
    list.innerHTML = "⏳ Đang tải sinh viên...";
  
    const res = await fetch(`/teacher/students?class_id=${class_id}`);
    const result = await res.json();
  
    if (!result.success || !result.data.length) {
      list.innerHTML = "<p>⚠ Không có sinh viên nào.</p>";
      return;
    }
  
    list.innerHTML = `
      <table>
        <thead><tr><th>Mã SV</th><th>Họ tên</th><th>SĐT</th></tr></thead>
        <tbody>
          ${result.data.map(sv => `
            <tr>
              <td>${sv.user_id}</td>
              <td>${sv.name}</td>
              <td>${sv.phone_number || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  };
  

  window.deleteClass = async function (class_id) {
    if (!confirm(`Bạn có chắc chắn muốn xoá lớp ${class_id}?`)) return;
    const res = await fetch(`/delete_class?class_id=${class_id}`, { method: "DELETE" });
    const result = await res.json();
    showMessage("actionMsg", result.message || result.detail, result.success !== false);
    if (result.success) loadClasses();
  }

  window.editClass = function (class_id) {
    const oldName = allClasses.find(c => c.class_id === class_id)?.class_name || "";
    const newName = prompt("Nhập tên lớp mới:", oldName);
    if (newName && newName !== oldName) {
      fetch(`/update_class_name?class_id=${class_id}&class_name=${encodeURIComponent(newName)}`, { method: "PUT" })
        .then(res => res.json())
        .then(result => {
          showMessage("actionMsg", result.message || result.detail, result.success !== false);
          if (result.success) loadClasses();
        });
    }
  }

  // === Xem lịch sử điểm danh ===
  const viewClassSelect = document.getElementById("view_class");
  const viewSessionSelect = document.getElementById("view_session");
  const viewBtn = document.getElementById("view_attendance_btn");
  const resultDiv = document.getElementById("attendance_result");

  function updateClassDropdown(classes) {
    viewClassSelect.innerHTML = `<option value="">-- Chọn lớp --</option>` +
      classes.map(cls => `<option value="${cls.class_id}">${cls.class_id} - ${cls.class_name}</option>`).join("");
  }

  viewClassSelect.onchange = async () => {
    const classId = viewClassSelect.value;
    viewSessionSelect.innerHTML = "<option value=''>-- Đang tải phiên... --</option>";
    resultDiv.innerHTML = "";
    if (!classId) return;

    const res = await fetch(`/get_sessions?class_id=${classId}`);
    const result = await res.json();

    if (result.success) {
      if (result.data.length === 0) {
        viewSessionSelect.innerHTML = "<option value=''>⚠ Không có phiên nào</option>";
      } else {
        viewSessionSelect.innerHTML = "<option value=''>-- Chọn phiên --</option>" +
          result.data.map(s => `<option value="${s.id}">[#${s.id}] ${s.start_time} → ${s.end_time}</option>`).join("");
      }
    } else {
      viewSessionSelect.innerHTML = "<option value=''>⚠ Lỗi tải phiên</option>";
    }
  }

  viewBtn.onclick = async () => {
    const sessionId = viewSessionSelect.value;
    const classId = viewClassSelect.value;
    resultDiv.innerHTML = "";
    if (!sessionId || !classId) {
      resultDiv.innerHTML = "<p style='color:red;'>⚠ Vui lòng chọn lớp và phiên điểm danh.</p>";
      return;
    }

    const res = await fetch(`/attendance_list_by_session?session_id=${sessionId}&class_id=${classId}`);
    const result = await res.json();

    if (!result.success || result.data.length === 0) {
      resultDiv.innerHTML = "<p>⚠ Không có dữ liệu điểm danh.</p>";
      return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr>
        <th>Mã SV</th><th>Họ tên</th><th>Thời gian</th><th>Trạng thái</th>
      </tr></thead>
      <tbody>
        ${result.data.map(item => `
          <tr>
            <td>${item.user_id}</td>
            <td>${item.name}</td>
            <td>${item.created_at}</td>
            <td>
              ${item.status === 'on-time' ? '✅ Có mặt' : 
                item.status === 'late' ? '⏰ Muộn' : '❌ Vắng'}
            </td>
          </tr>
        `).join("")}
      </tbody>
    `;
    resultDiv.appendChild(table);

    const exportBtn = document.createElement("button");
    exportBtn.textContent = "📥 Xuất CSV";
    exportBtn.style.marginTop = "1rem";
    exportBtn.onclick = () => {
      const rows = ["Mã SV,Họ tên,Thời gian,Trạng thái"];
      result.data.forEach(item => {
        rows.push(`${item.user_id},${item.name},${item.created_at},${item.status}`);
      });
      const csvContent = "\uFEFF" + rows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `diem_danh_session_${sessionId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    resultDiv.appendChild(exportBtn);
  }

  loadClasses();
}


// =============================
// ✅ Logic cho info.html
// =============================
if (window.location.pathname.endsWith("info.html")) {
  const { user_id } = getCurrentUser();
  if (!user_id) {
    alert("Bạn chưa đăng nhập!");
    window.location.href = "/login.html";
  }

  // 🚀 Load thông tin người dùng
  fetch(`/info?user_id=${user_id}`)
    .then(res => res.json())
    .then(res => {
      if (res.success) {
        const data = res.data;
        document.getElementById("infoUserId").textContent = data.user_id;
        document.getElementById("infoUserName").textContent = data.name;
        document.getElementById("infoUserRole").textContent = data.role;
        document.getElementById("infoPhone").textContent = data.phone_number || "(chưa có)";
        document.getElementById("infoUpdatedAt").textContent = data.updated_at || "(chưa có)";
        document.getElementById("infoFaceImage").src = `/info/face_image?user_id=${user_id}`;
      } else {
        alert("Không lấy được thông tin tài khoản.");
      }
    });

  // ✏️ Cập nhật tên
  window.updateName = async function () {
    const new_name = document.getElementById("newName").value.trim();
    if (!new_name) return alert("Vui lòng nhập tên mới");

    const res = await postJSON("/info/update_name", {
      user_id,
      new_name
    });

    alert(res.message || "Đã cập nhật tên");
    location.reload();
  };

  // 🔑 Đổi mật khẩu
  window.changePassword = async function () {
    const old_password = document.getElementById("oldPassword").value;
    const new_password = document.getElementById("newPassword").value;

    if (!old_password || !new_password) {
      alert("Vui lòng nhập đầy đủ mật khẩu");
      return;
    }

    const res = await postJSON("/info/change_password", {
      user_id,
      old_password,
      new_password
    });

    alert(res.message || "Đã đổi mật khẩu");
    document.getElementById("oldPassword").value = "";
    document.getElementById("newPassword").value = "";
  };

  // 📷 Cập nhật ảnh khuôn mặt
  window.updateFaceImage = async function () {
    const input = document.getElementById("faceImageInput");
    const file = input.files[0];
    if (!file) return alert("Vui lòng chọn ảnh");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/info/update_face?user_id=${user_id}`, {
      method: "POST",
      body: formData
    });

    const result = await res.json();
    alert(result.message || "Đã cập nhật ảnh");

    input.value = "";
    document.getElementById("infoFaceImage").src = `/info/face_image?user_id=${user_id}&t=${Date.now()}`; // để tránh cache
  };

  // 📱 Cập nhật số điện thoại
  window.updatePhone = async function () {
    const new_phone = document.getElementById("newPhone").value.trim();
    if (!new_phone) return alert("Vui lòng nhập số điện thoại mới");

    const res = await postJSON("/info/update_phone", {
      user_id,
      phone_number: new_phone
    });

    alert(res.message || "Đã cập nhật số điện thoại");
    location.reload();
  };
}

// =============================
// ✅ Logic cho enrollment.html
// =============================
if (window.location.pathname.endsWith("enrollment.html")) {
  const { user_id, role } = getCurrentUser();

  if (!user_id || role !== "student") {
    alert("Bạn chưa đăng nhập với tư cách sinh viên!");
    window.location.href = "/login.html";
  }

  const enrollForm = document.getElementById("enrollForm");
  const classIdInput = document.getElementById("class_id");
  const classKeyInput = document.getElementById("class_key");

  enrollForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const class_id = classIdInput.value.trim();
    const class_key = classKeyInput.value.trim();

    if (!class_id || !class_key) {
      showMessage("msg", "⚠️ Vui lòng nhập đầy đủ mã lớp và key!", false);
      return;
    }

    try {
      const res = await fetch("/enroll_class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, class_id, class_key })
      });

      const data = await res.json();
      showMessage("msg", data.message || data.detail, data.success !== false);

      if (data.success) {
        classIdInput.value = "";
        classKeyInput.value = "";
      }
    } catch (err) {
      showMessage("msg", "❌ Lỗi khi gửi yêu cầu đến server!", false);
      console.error(err);
    }
  });
}
