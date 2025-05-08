// =============================
// ✅ Logic cho student.html (tối ưu + có modal hủy lớp)
// =============================

const user = getCurrentUser();
const user_id = user?.user_id;
let classIdToUnenroll = null;

window.onload = async function () {
  if (!user || user.role !== "student") {
    window.location.href = "/login.html";
    return;
  }
  document.getElementById("student-name").textContent = user.user_name;
  loadRegisteredClasses();  
};

function showSection(section) {
  const sections = ['attendance', 'classes', 'info'];
  sections.forEach(id => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.style.display = 'none';
  });

  const target = document.getElementById(`section-${section}`);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.student-sidebar a:not(.logout-button)').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`.student-sidebar a[data-section="${section}"]`);
  if (link) link.classList.add('active');

  if (section === 'classes') loadRegisteredClasses();
  if (section === 'info') loadAccountInfo();
}

// ========== Đăng ký lớp học phần ==========
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("enroll-form");
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const class_id = document.getElementById("enroll-class-id").value.trim();
      const class_key = document.getElementById("enroll-class-key").value.trim();
      const msg = document.getElementById("enroll-message");

      const res = await fetch("/enroll_class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, class_id, class_key })
      });

      const data = await res.json();
      msg.textContent = data.message || "Lỗi";
      msg.style.color = data.success ? "green" : "red";

      if (data.success) {
        form.reset();
        loadRegisteredClasses();
      }
    });
  }
});

// ========== Hiển thị danh sách lớp đã đăng ký ==========
async function loadRegisteredClasses() {
  const container = document.getElementById("registered-classes");
  container.innerHTML = "Đang tải...";

  try {
    const res = await fetch(`/get_student_classes?user_id=${user_id}`);
    const data = await res.json();

    if (!data.success || data.data.length === 0) {
      container.innerHTML = "<p>⚠️ Bạn chưa đăng ký lớp nào.</p>";
      return;
    }

    let html = `
      <table class="info-table">
        <thead><tr><th>Mã lớp</th><th>Tên lớp</th><th>Hành động</th></tr></thead>
        <tbody>
    `;

    data.data.forEach(cls => {
      html += `
        <tr>
          <td>${cls.class_id}</td>
          <td>${cls.class_name}</td>
          <td>
            <button class="btn btn-red btn-sm" onclick="showUnenrollModal('${cls.class_id}')">🗑️ Hủy</button>
            <button class="btn btn-blue btn-sm" onclick="openAttendanceModal('${cls.class_id}')">📋 Xem lịch sử</button>
          </td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style='color:red;'>❌ Lỗi khi tải lớp học phần.</p>`;
  }
}

// ========== Modal xác nhận huỷ lớp ==========
function showUnenrollModal(class_id) {
  classIdToUnenroll = class_id;
  document.getElementById("unenrollModalText").innerHTML =
    `Bạn có chắc muốn hủy đăng ký lớp <strong>${class_id}</strong>?`;
  document.getElementById("confirmUnenrollModal").style.display = "flex";
}

function closeUnenrollModal() {
  document.getElementById("confirmUnenrollModal").style.display = "none";
  classIdToUnenroll = null;
}

async function confirmUnenroll() {
  if (!classIdToUnenroll) return;

  const res = await fetch(`/unenroll_class?user_id=${user_id}&class_id=${classIdToUnenroll}`, {
    method: "DELETE"
  });
  const data = await res.json();
  alert(data.message);
  closeUnenrollModal();
  if (data.success) loadRegisteredClasses();
}

// ========== Thông tin tài khoản ========== 
async function loadAccountInfo() {
  const res = await fetch(`/info?user_id=${user_id}`);
  const json = await res.json();
  const data = json.data;
  const infoArea = document.getElementById("account-info");

  infoArea.innerHTML = `
    <div class="profile-container">
      <div class="avatar-section">
        <img src="/info/face_image?user_id=${data.user_id}" alt="Ảnh khuôn mặt" class="avatar-img"
             onerror="this.src='/static/default-avatar.png'">
      </div>
      <div class="info-view">
        <table class="info-table">
          <tr><th>Mã sinh viên</th><td>${data.user_id}</td></tr>
          <tr><th>Họ tên</th><td>${data.name}</td></tr>
          <tr><th>Email</th><td>${data.email || "Chưa có"}</td></tr>
          <tr><th>Số điện thoại</th><td>${data.phone_number || "Chưa có"}</td></tr>
          <tr><th>Cập nhật lần cuối</th><td>${data.updated_at || "Không rõ"}</td></tr>
        </table>
        <button id="edit-info-btn" class="btn mt-2">✏️ Sửa thông tin</button>
      </div>

      <div class="info-edit" style="display: none;">
        <form id="edit-info-form">
          <label>Họ tên:</label>
          <input type="text" id="edit-name" value="${data.name}" required />

          <label>Email:</label>
          <input type="email" id="edit-email" value="${data.email || ''}" required />

          <label>Số điện thoại:</label>
          <input type="text" id="edit-phone" value="${data.phone_number || ''}" required />

          <hr style="margin: 1rem 0;" />
          <h4>🔐 Đổi mật khẩu</h4>

          <label>Mật khẩu hiện tại:</label>
          <input type="password" id="current-password" />

          <label>Mật khẩu mới:</label>
          <input type="password" id="new-password" />

          <label>Nhập lại mật khẩu mới:</label>
          <input type="password" id="confirm-password" />

          <div class="mt-2">
            <button type="submit" class="btn">💾 Lưu</button>
            <button type="button" class="btn btn-secondary" id="cancel-edit-btn">❌ Hủy</button>
          </div>

          <p id="info-message" class="mt-2"></p>
        </form>
      </div>
    </div>
  `;

  document.getElementById("edit-info-btn").onclick = () => {
    document.querySelector(".info-view").style.display = "none";
    document.querySelector(".info-edit").style.display = "block";
  };

  document.getElementById("cancel-edit-btn").onclick = () => {
    loadAccountInfo();
  };

  document.getElementById("edit-info-form").onsubmit = async (e) => {
    e.preventDefault();
    const new_name = document.getElementById("edit-name").value.trim();
    const new_email = document.getElementById("edit-email").value.trim();
    const new_phone = document.getElementById("edit-phone").value.trim();
    const msg = document.getElementById("info-message");

    const currentPass = document.getElementById("current-password").value.trim();
    const newPass = document.getElementById("new-password").value.trim();
    const confirmPass = document.getElementById("confirm-password").value.trim();

    try {
      const r1 = await fetch("/info/update_name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, new_name })
      });
      const r2 = await fetch("/info/update_phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, phone_number: new_phone })
      });

      const res1 = await r1.json();
      const res2 = await r2.json();

      let res3Message = "";
      if (currentPass || newPass || confirmPass) {
        if (!currentPass || !newPass || !confirmPass) {
          msg.textContent = "❗ Vui lòng điền đầy đủ thông tin đổi mật khẩu.";
          msg.style.color = "red";
          return;
        }
        if (newPass !== confirmPass) {
          msg.textContent = "❗ Mật khẩu mới không trùng khớp.";
          msg.style.color = "red";
          return;
        }

        const res3 = await fetch("/info/change_password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id, old_password: currentPass, new_password: newPass })
        });

        if (!res3.ok) {
          const errText = await res3.text();
          msg.textContent = `❌ Lỗi: ${res3.status} - ${errText}`;
          msg.style.color = "red";
          return;
        }

        const res3Data = await res3.json();
        if (!res3Data.success) {
          msg.textContent = res3Data.message || "❌ Đổi mật khẩu thất bại.";
          msg.style.color = "red";
          return;
        }
        res3Message = res3Data.message || "";
      }

      msg.style.color = res1.message && res2.message ? "green" : "red";
      msg.textContent = `${res1.message || ""} ${res2.message || ""} ${res3Message}`.trim();

      if (res1.message && res2.message) {
        localStorage.setItem("user_name", new_name);
        setTimeout(loadAccountInfo, 1000);
      }
    } catch (err) {
      msg.textContent = "❌ Có lỗi xảy ra khi cập nhật!";
      msg.style.color = "red";
    }
  };
}


// ========== Modal điểm danh theo lớp ==========
async function openAttendanceModal(class_id) {
  const modal = document.getElementById("attendanceHistoryModal");
  const historyContent = document.getElementById("attendance-history-content");
  historyContent.innerHTML = "Đang tải dữ liệu...";
  modal.style.display = "flex";

  try {
    const res = await fetch(`/get_attendance_history?user_id=${user_id}&class_id=${class_id}`);
    const json = await res.json();
    const data = json.data;

    if (!data || data.length === 0) {
      historyContent.innerHTML = "📭 Không có lịch sử điểm danh.";
      return;
    }

    let html = `
      <table class="table">
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const row of data) {
      html += `
        <tr>
          <td>${row.date}</td>
          <td>${row.time_range}</td>
          <td>${row.status}</td>
        </tr>
      `;
    }

    html += "</tbody></table>";
    historyContent.innerHTML = html;
  } catch (err) {
    historyContent.innerHTML = "❌ Lỗi khi tải lịch sử.";
  }
}

function closeAttendanceModal() {
  document.getElementById("attendanceHistoryModal").style.display = "none";
}

function showClassKey() {
  document.getElementById("enroll-class-key").type = "text";
}
function hideClassKey() {
  document.getElementById("enroll-class-key").type = "password";
}

setupModalLogout();
