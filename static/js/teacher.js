if (window.location.pathname.endsWith("teacher.html")) {
  const { user_id, user_name, role } = getCurrentUser();
  if (!user_id || role !== "teacher") {
    window.location.href = "/login.html";
  }

  if (user_name) {
    document.getElementById("teacherName").textContent = user_name;
  }

  let allClasses = [];
  let deleteTarget = { class_id: null, user_id: null };
  let currentEditClassId = null;
  let currentClassForSession = null;

  // ✅ Tạo lớp học phần
  document.getElementById("createClassForm").onsubmit = async (e) => {
    e.preventDefault();
    const class_id = document.getElementById("class_id").value.trim();
    const class_name = document.getElementById("class_name").value.trim();
    const class_key = document.getElementById("class_key").value.trim();

    const res = await fetch(
      `/create_class?class_id=${class_id}&class_name=${encodeURIComponent(class_name)}&class_key=${encodeURIComponent(class_key)}&teacher_id=${user_id}`,
      { method: "POST" }
    );

    const result = await res.json();
    showMessage("createMsg", result.message || result.detail, result.success !== false);

    if (result.success) {
      document.getElementById("createClassForm").reset();
      loadClasses();
    }
  };

  // ✅ Load danh sách lớp học
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
            <div class="class-meta" style="margin-top: 5px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="font-size: 16px;">🏷️</span>
                <strong style="font-weight: 600;">Mã lớp:</strong> 
                <span>c1</span>
              </div>
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="font-size: 16px;">🕒</span>
                <strong style="font-weight: 600;">Ngày tạo:</strong> 
                <span>22:52 21/4/25</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="display: flex; align-items: center; font-weight: 600;">
                  <div style="display: flex; align-items: center; gap: 5px;">
                    <span style="font-size: 16px;">🔑</span>
                    <strong style="font-weight: 600;">Mã đăng ký:</strong>
                  </div>
                </label>
                <div class="key-input-container">
                  <input type="password" class="class-key-pass" id="key-${cls.class_id}" value="${cls.class_key}" readonly/>
                  <button type="button"
                      class="class-key-toggle"
                      onmousedown="togglePassword('key-${cls.class_id}', true)"
                      onmouseup="togglePassword('key-${cls.class_id}', false)"
                      onmouseleave="togglePassword('key-${cls.class_id}', false)">👁</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="class-actions">
          <button onclick="showCreateSessionModal('${cls.class_id}')">➕ Tạo phiên</button>
          <button onclick="viewSessionsModal('${cls.class_id}')">📜 Xem phiên</button>
          <button onclick="viewStudentsModal('${cls.class_id}')">👨‍🎓 Xem SV</button>
          <button onclick="openEditClassModal('${cls.class_id}', '${cls.class_name}', '${cls.class_key}')">⚙️ Chỉnh sửa lớp học phần</button>
        </div>
      </div>
    `).join("");
  } else {
    div.innerHTML = `<p style="color:red;">${result.message}</p>`;
  }
};

  // ✅ Hàm định dạng ngày
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
  }

  window.togglePassword = function(id, show) {
    const input = document.getElementById(id);
    if (input) input.type = show ? 'text' : 'password';
  };
  
  // ✅ Mở modal tạo phiên
  window.showCreateSessionModal = function(class_id) {
    currentClassForSession = class_id;
    document.getElementById("sessionStartInput").value = "";
    document.getElementById("sessionEndInput").value = "";
    document.getElementById("createSessionMsg").textContent = "";
    document.getElementById("createSessionModal").style.display = "flex";
  };

  // ✅ Đóng modal tạo phiên
  window.closeCreateSessionModal = function () {
    document.getElementById("createSessionModal").style.display = "none";
    currentClassForSession = null;
  };

  // ✅ Gửi tạo phiên lên server
  const createBtn = document.getElementById("confirmCreateSessionBtn");
  if (createBtn) {
    createBtn.onclick = async function () {
      const start = document.getElementById("sessionStartInput").value;
      const end = document.getElementById("sessionEndInput").value;
      const msg = document.getElementById("createSessionMsg");
      const ontimeLimit = parseInt(document.getElementById("ontimeLimitInput").value || "10");

      if (!start || !end) {
        msg.textContent = "⚠️ Vui lòng chọn đủ thời gian!";
        return;
      }

      const res = await fetch("/create_session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: currentClassForSession,
          start_time: start,
          end_time: end,
          ontime_limit: ontimeLimit
        })
      });

      const result = await res.json();

      if (result.success) {
        msg.textContent = "✅ Tạo phiên thành công!";
        setTimeout(() => {
          closeCreateSessionModal();
          loadClasses();
        }, 1000); // chờ 1 giây để giảng viên thấy thông báo
      } else {
        msg.textContent = result.message || "❌ Lỗi tạo phiên!";
      }
    };
  }
  
  // ✅ Hiển thị phiên trong modal
  window.viewSessionsModal = async function (class_id) {
    const modal = document.getElementById("sessionModal");
    const body = document.getElementById("sessionModalBody");

    modal.style.display = "flex";
    body.innerHTML = "⏳ Đang tải...";

    const res = await fetch(`/get_sessions?class_id=${class_id}`);
    const result = await res.json();

    if (!result.success || !result.data.length) {
      body.innerHTML = "<p>⚠ Không có phiên nào.</p>";
      return;
    }

    const sessions = result.data;
    body.innerHTML = `
      <table>
        <thead><tr><th>STT</th><th>Bắt đầu</th><th>Kết thúc</th><th>Ngày tạo</th><th>On-time</th></tr></thead>
        <tbody>
          ${sessions.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${s.start_time}</td>
              <td>${s.end_time}</td>
              <td>${s.ontime_limit || 10} phút</td>
              <td>${s.created_at}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  };

    // ✅ Hàm hiển thị danh sách sinh viên trong modal
    window.viewStudentsModal = async function (class_id) {
      const modal = document.getElementById("studentModal");
      const body = document.getElementById("studentModalBody");
    
      modal.style.display = "flex";
      modal.dataset.classId = class_id;
    
      body.innerHTML = "⏳ Đang tải...";
    
      const res = await fetch(`/teacher/students?class_id=${class_id}`);
      const result = await res.json();
    
      if (!result.success || !result.data.length) {
        body.innerHTML = "<p>⚠ Không có sinh viên nào.</p>";
        return;
      }
    
      const students = result.data.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
      const tableId = `student-table-${class_id}`;
    
      body.innerHTML = `
      <p style="margin: 10px 0;">👥 Tổng số sinh viên: ${students.length}</p>
      <div style="overflow-x: auto;">
        <table id="${tableId}" class="student-table" style="min-width: 800px;">
          <thead><tr><th>STT</th><th>Mã SV</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Xoá</th></tr></thead>
          <tbody>
            ${students.map((sv, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${sv.user_id}</td>
                <td>${sv.name}</td>
                <td>${sv.email || "-"}</td>
                <td>${sv.phone_number || "-"}</td>
                <td><button onclick="showConfirmDelete('${class_id}', '${sv.user_id}')">❌</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    
      // ✅ Cập nhật lại ô tìm kiếm sau khi render bảng xong
      const searchInput = document.getElementById("studentSearchInput");
      if (searchInput) {
        searchInput.oninput = function() {
          filterStudents(tableId, this.value);
        };
      }
    };
  
    window.showConfirmDelete = function (class_id, user_id) {
      deleteTarget = { class_id, user_id };
      document.getElementById("confirmDeleteText").innerHTML =
          `Bạn có chắc chắn muốn xoá sinh viên <strong>${user_id}</strong> khỏi lớp <strong>${class_id}</strong>?`;
      document.getElementById("confirmDeleteModal").style.display = "flex";
    };
  
    window.closeConfirmDelete = function () {
      document.getElementById("confirmDeleteModal").style.display = "none";
    };

    document.getElementById("confirmDeleteBtn").onclick = async function () {
      const { class_id, user_id } = deleteTarget;
    
      if (user_id) {
        // Xoá sinh viên
        const res = await fetch(`/remove_student_from_class?class_id=${class_id}&user_id=${user_id}`, { method: "DELETE" });
        const result = await res.json();
        alert(result.message || (result.success ? "✅ Đã xoá sinh viên" : "❌ Lỗi"));
        if (result.success) viewStudentsModal(class_id);
      } else {
        // Xoá lớp học phần
        const res = await fetch(`/delete_class?class_id=${class_id}`, { method: "DELETE" });
        const result = await res.json();
        alert(result.message || (result.success ? "✅ Đã xoá lớp học phần" : "❌ Lỗi"));
        if (result.success) loadClasses();
      }
    
      closeConfirmDelete();
    };
    
    // Khi bấm nút "Sửa" lớp
    window.openEditClassModal = function(classId, className, classKey) {
      const modal = document.getElementById('modal-edit-class');
      document.getElementById('edit-class-name').value = className || '';
      document.getElementById('edit-class-key').value = classKey || '';
      document.getElementById('edit-class-form').dataset.classId = classId;
      modal.style.display = 'flex';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';
    }

    // Hàm đóng modal
    window.closeEditModal = function() {
      const modal = document.getElementById('modal-edit-class');
      modal.style.display = 'none';
      // Reset form khi đóng
      document.getElementById('edit-class-form').reset();
      delete document.getElementById('edit-class-form').dataset.classId;
    }

    // Hàm xử lý lưu chỉnh sửa lớp
    document.getElementById('edit-class-form').onsubmit = async function(e) {
      e.preventDefault();
      const classId = e.target.dataset.classId;
      const newName = document.getElementById('edit-class-name').value.trim();
      const newKey = document.getElementById('edit-class-key').value.trim();

      if (!newName || !newKey) {
        showMessage('⚠️ Vui lòng nhập đầy đủ thông tin!', false);
        return;
      }

      const res = await fetch('/update_class', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: classId, class_name: newName, class_key: newKey })
      });

      const result = await res.json();
      if (result.success) {
        showMessage('✅ Cập nhật lớp thành công!');
        closeEditModal();
        loadClasses(); // load lại danh sách lớp
      } else {
        showMessage('❌ Lỗi cập nhật lớp!', false);
      }
    }
    
    // Mở modal xác nhận xoá lớp
    window.openConfirmDeleteModal = function() {
      const modal = document.getElementById('modal-confirm-delete-class');
      modal.style.display = 'flex'; // ✅
      modal.style.justifyContent = 'center'; // ✅
      modal.style.alignItems = 'center'; // ✅
      modal.style.zIndex = 9999; // ✅ nổi lên trên tất cả
    }

    // Đóng modal xác nhận xoá
    window.closeConfirmDeleteModal = function() {
      document.getElementById('modal-confirm-delete-class').style.display = 'none';
    }

    // Thực hiện xoá lớp học phần
    document.getElementById('confirmDeleteClassBtn').onclick = async function() {
      const classId = document.getElementById('edit-class-form').dataset.classId;
      if (!classId) {
        alert('Không tìm thấy lớp để xoá!');
        return;
      }

      const res = await fetch('/delete_class', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ class_id: classId })
      });

      const result = await res.json();
      if (result.success) {
        showMessage('✅ Đã xoá lớp học phần!');
        closeConfirmDeleteModal();
        closeEditModal();
        loadClasses(); // load lại danh sách lớp
      } else {
        showMessage('❌ Xoá lớp thất bại!', false);
      }
    }

  // ✅ Thêm sinh viên
  window.addStudentToClass = async function() {
    const input = document.getElementById("addStudentInput");
    const user_id = input.value.trim();
    const class_id = document.getElementById("studentModal").dataset.classId;
    
    if (!user_id) {
      alert("⚠️ Vui lòng nhập mã sinh viên!");
      return;
    }
  
    const res = await postJSON("/add_student_to_class", { class_id, user_id });
    alert(res.message || (res.success ? "✅ Thêm sinh viên thành công!" : "❌ Thêm thất bại"));
  
    if (res.success) {
      input.value = "";
      viewStudentsModal(class_id);
    }
  };

  // ✅ Xoá sinh viên khỏi lớp
  window.removeStudent = async function (class_id, user_id) {
    if (!confirm(`Bạn có chắc chắn muốn xoá sinh viên ${user_id} khỏi lớp ${class_id}?`)) return;
    const res = await fetch(`/remove_student_from_class?class_id=${class_id}&user_id=${user_id}`, { method: "DELETE" });
    const result = await res.json();
    alert(result.message || (result.success ? "✅ Đã xoá" : "❌ Lỗi"));
    if (result.success) {
      viewStudentsModal(class_id);
    }
  };

  // ✅ Đóng modal
  window.closeStudentModal = function () {
    document.getElementById("studentModal").style.display = "none";
  };

  window.closeSessionModal = function () {
    document.getElementById("sessionModal").style.display = "none";
  };

  // ✅ Tìm kiếm sinh viên
  window.filterStudents = function(tableId, keyword) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = table.querySelectorAll("tbody tr");
    keyword = keyword.toLowerCase();

    rows.forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(keyword) ? "" : "none";
    });
  };

  // =============================
// ✅ Xem danh sách điểm danh theo phiên - triển khai đầy đủ
// =============================
window.viewAttendanceBySession = async function(session_id, class_id) {
  const modal = document.getElementById("sessionModal");
  const body = document.getElementById("sessionModalBody");

  body.innerHTML = "⏳ Đang tải dữ liệu điểm danh...";
  const res = await fetch(`/attendance_list_by_session?session_id=${session_id}&class_id=${class_id}`);
  const result = await res.json();

  if (!result.success || !result.data.length) {
    body.innerHTML = "<p>⚠ Không có sinh viên điểm danh.</p><button onclick=\"viewSessionsModal('" + class_id + "')\">🔙 Quay lại danh sách phiên</button>";
    return;
  }

  const rows = result.data.map(r => `
    <tr>
      <td>${r.user_id}</td>
      <td>${r.name}</td>
      <td>${r.status}</td>
      <td>${r.created_at || "-"}</td>
    </tr>
  `).join("");

  body.innerHTML = `
    <h4>📄 Danh sách điểm danh phiên</h4>
    <table>
      <thead><tr><th>Mã SV</th><th>Họ tên</th><th>Trạng thái</th><th>Thời gian</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align: right; margin-top: 10px;">
      <button onclick="viewSessionsModal('${class_id}')" class="btn-blue">🔙 Quay lại danh sách phiên</button>
    </div>
  `;
};

// =============================
// ✅ Cập nhật thêm nút "Xem điểm danh" trong viewSessionsModal
// =============================
window.viewSessionsModal = async function (class_id) {
  const modal = document.getElementById("sessionModal");
  const body = document.getElementById("sessionModalBody");

  modal.style.display = "flex";
  body.innerHTML = "⏳ Đang tải...";

  const res = await fetch(`/get_sessions?class_id=${class_id}`);
  const result = await res.json();

  if (!result.success || !result.data.length) {
    body.innerHTML = "<p>⚠ Không có phiên nào.</p>";
    return;
  }

  const sessions = result.data;

  body.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr>
          <th>STT</th>
          <th>Bắt đầu</th>
          <th>Kết thúc</th>
          <th>Ngày tạo</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        ${sessions.map((s, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${s.start_time}</td>
            <td>${s.end_time}</td>
            <td>${s.created_at}</td>
            <td>
              <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                <button class="btn-action" onclick="viewAttendanceBySession('${s.session_id}', '${class_id}')">📄 Xem điểm danh</button>
                <button class="btn-action" onclick="exportAttendanceExcel('${s.session_id}', '${class_id}')">📥 Xuất Excel</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
};

window.exportAttendanceExcel = function(session_id, class_id) {
  const url = `/export_attendance_excel?session_id=${session_id}&class_id=${class_id}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance_${class_id}_session${session_id}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  // ✅ Khởi động
  loadClasses();
  setupModalLogout();
}
