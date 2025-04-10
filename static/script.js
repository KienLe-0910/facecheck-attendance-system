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

        const msgEl = document.getElementById("faceMsg");
        if (msgEl) {
          if (detections.length === 0) {
            msgEl.textContent = "🚫 Không phát hiện khuôn mặt.";
            msgEl.style.color = "gray";
            window._faceIsValid = false;
          } else if (detections.length > 1) {
            msgEl.textContent = `⚠️ Phát hiện ${detections.length} khuôn mặt!`;
            msgEl.style.color = "red";
            window._faceIsValid = false;
          } else {
            msgEl.textContent = "✅ Phát hiện 1 khuôn mặt.";
            msgEl.style.color = "green";
            window._faceIsValid = true;
          }
        }

        // Tìm khuôn mặt lớn nhất
        let largestIndex = 0;
        let maxArea = 0;
        for (let i = 0; i < detections.length; i++) {
          const box = detections[i].box;
          const area = box.width * box.height;
          if (area > maxArea) {
            maxArea = area;
            largestIndex = i;
          }
        }

        // Vẽ khung viền
        detections.forEach((det, i) => {
          const { x, y, width, height } = det.box;
          ctx.beginPath();
          ctx.strokeStyle = i === largestIndex ? "lime" : "red";
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

  const detections = await faceapi.detectAllFaces(video, options);
  if (!detections || detections.length === 0) return null;

  // Tìm khuôn mặt lớn nhất
  let largest = detections[0];
  let maxArea = largest.box.width * largest.box.height;

  for (let i = 1; i < detections.length; i++) {
    const area = detections[i].box.width * detections[i].box.height;
    if (area > maxArea) {
      largest = detections[i];
      maxArea = area;
    }
  }

  const { x, y, width, height } = largest.box;
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

window._faceCapturedImage = null;

// 📷 Chụp khuôn mặt
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

    // Hiển thị preview
    window._faceCapturedImage = imageBase64;
    const img = document.getElementById("previewImage");
    const preview = document.getElementById("facePreview");

    img.src = imageBase64;
    img.style.display = "block";
    preview.style.display = "block";

    showMessage("faceMsg", "✅ Đã chụp ảnh, vui lòng xác nhận hoặc chụp lại.", true);
  };
}

// 🔁 Chụp lại ảnh
const retakeBtn = document.getElementById("retakeFace");
if (retakeBtn) {
  retakeBtn.onclick = () => {
    const img = document.getElementById("previewImage");
    const preview = document.getElementById("facePreview");

    img.src = "";
    img.style.display = "none";
    preview.style.display = "none";
    window._faceCapturedImage = null;

    showMessage("faceMsg", "📸 Mời bạn chụp lại khuôn mặt.", true);
  };
}

// ✅ Gửi đăng ký (gộp cả info + ảnh + số điện thoại)
const finalBtn = document.getElementById("finalRegisterBtn");
if (finalBtn) {
  finalBtn.onclick = async () => {
    const user_id = document.getElementById("student_id").value.trim();
    const name = document.getElementById("name").value.trim();
    const password = document.getElementById("password").value;
    const phone_number = document.getElementById("phone_number").value.trim();
    const image_data = window._faceCapturedImage;

    if (!user_id || !name || !password || !phone_number) {
      showMessage("infoMsg", "⚠ Vui lòng nhập đầy đủ thông tin.", false);
      return;
    }

    if (!image_data) {
      showMessage("faceMsg", "⚠ Bạn chưa chụp ảnh khuôn mặt!", false);
      return;
    }

    try {
      const res = await postJSON("/register", {
        user_id,
        name,
        password,
        phone_number,
        role: "student",
        image_data
      });

      if (res.success) {
        showMessage("infoMsg", res.message || "✅ Đăng ký thành công!", true);
        showMessage("faceMsg", "✅ Ảnh khuôn mặt đã được lưu!", true);

        setTimeout(() => {
          window.location.href = "/login.html";
        }, 2000);
      } else {
        showMessage("infoMsg", res.message || "❌ Đăng ký thất bại!", false);
      }
    } catch (err) {
      showMessage("infoMsg", "❌ Lỗi kết nối server!", false);
      console.error(err);
    }
  };
}


// =============================
// ✅ Quản lý admin (admin.html)
// =============================
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

// =============================
// ✅ Tự động bật camera nếu có
// =============================
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

  // Tạo lớp học
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

  // Tạo phiên điểm danh
  document.getElementById("createSessionForm").onsubmit = async (e) => {
    e.preventDefault();
    const class_id = document.getElementById("session_class_id").value;
    const start_time = document.getElementById("start_time").value;
    const end_time = document.getElementById("end_time").value;

    const res = await fetch("/create_session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id, start_time, end_time })
    });

    const result = await res.json();
    showMessage("sessionMsg", result.message || result.detail, result.success !== false);
    if (result.success) document.getElementById("createSessionForm").reset();
  };

  // Tải danh sách lớp học
  async function loadClasses() {
    const res = await fetch(`/get_classes_by_teacher?teacher_id=${user_id}`);
    const result = await res.json();
    const div = document.getElementById("classList");

    if (result.success) {
      allClasses = result.data;
      renderClassList(allClasses);

      const select = document.getElementById("session_class_id");
      select.innerHTML = `<option value="">-- Chọn lớp học phần --</option>` +
        result.data.map(cls => `<option value="${cls.class_id}">${cls.class_id} - ${cls.class_name}</option>`).join("");

      updateClassDropdown(allClasses);
    } else {
      div.innerHTML = `<p style="color:red;">${result.message}</p>`;
    }
  }

  // Render danh sách lớp học
  function renderClassList(classList) {
    const div = document.getElementById("classList");
    if (classList.length === 0) {
      div.innerHTML = "<p>Không có lớp học phần nào.</p>";
      return;
    }

    const html = classList.map(cls => `
      <div class="class-item">
        <strong>${cls.class_id}</strong> - <span id="name-${cls.class_id}">${cls.class_name}</span>
        <button onclick="editClass('${cls.class_id}')">✏️ Sửa</button>
        <button onclick="deleteClass('${cls.class_id}')">❌ Xoá</button>
      </div>
    `).join("");

    div.innerHTML = html;
  }

  window.loadClasses = loadClasses;

  // Xoá lớp học
  window.deleteClass = async function (class_id) {
    if (!confirm(`Bạn có chắc chắn muốn xoá lớp ${class_id}?`)) return;
    const res = await fetch(`/delete_class?class_id=${class_id}`, { method: "DELETE" });
    const result = await res.json();
    showMessage("actionMsg", result.message || result.detail, result.success !== false);
    if (result.success) loadClasses();
  };

  // Sửa lớp học
  window.editClass = function (class_id) {
    const nameSpan = document.getElementById(`name-${class_id}`);
    const oldName = nameSpan.textContent;
    const newName = prompt("Nhập tên lớp mới:", oldName);
    if (newName && newName !== oldName) {
      fetch(`/update_class_name?class_id=${class_id}&class_name=${encodeURIComponent(newName)}`, { method: "PUT" })
        .then(res => res.json())
        .then(result => {
          showMessage("actionMsg", result.message || result.detail, result.success !== false);
          if (result.success) loadClasses();
        });
    }
  };

  // Xem điểm danh theo phiên
  const viewClassSelect = document.getElementById("view_class");
  const viewSessionSelect = document.getElementById("view_session");
  const viewBtn = document.getElementById("view_attendance_btn");
  const resultDiv = document.getElementById("attendance_result");

  // Cập nhật dropdown lớp học
  function updateClassDropdown(classes) {
    viewClassSelect.innerHTML = `<option value="">-- Chọn lớp --</option>` +
      classes.map(cls => `<option value="${cls.class_id}">${cls.class_id} - ${cls.class_name}</option>`).join("");
  }

  // Tải phiên điểm danh
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
  };

  // Xem lịch sử điểm danh
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


    // Tạo nút xuất file CSV
    const exportBtn = document.createElement("button");
    exportBtn.textContent = "📥 Xuất CSV";
    exportBtn.style.marginTop = "1rem";
    exportBtn.onclick = () => {
      const rows = ["Mã SV,Họ tên,Thời gian,Trạng thái"];
      result.data.forEach(item => {
        rows.push(`${item.user_id},${item.name},${item.created_at},${item.status}`);
      });

      // ⚠ Thêm BOM "\uFEFF" để đảm bảo UTF-8 hiển thị đúng trong Excel
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
  };

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
