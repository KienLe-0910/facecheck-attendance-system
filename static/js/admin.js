// =============================
// ✅ Logic cho admin.html
// =============================
if (window.location.pathname.endsWith("admin.html")) {
    const teacherForm = document.getElementById("create-teacher-form");
    const tableBody = document.getElementById("teacher-table-body");
    const loadBtn = document.getElementById("load-teachers");
  
    const { user_name, role } = getCurrentUser();
    if (role !== "admin") {
      window.location.href = "/login.html";
    }
  
    document.getElementById("admin-name").textContent = user_name || "Admin";
  
    if (teacherForm) {
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
  
        const role = document.getElementById("role").value;

        const res = await postJSON("/admin/create_user", {
          user_id,
          name,
          phone_number,
          email,
          password,
          role
        });
  
        showMessage("admin-message", res.message || res.detail, res.success !== false);
        if (res.success) {
          teacherForm.reset();
          if (loadBtn) loadBtn.click(); // reload danh sách
        }
      };
    }
  
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
              <button onclick="viewClassesOfTeacher('${teacher.user_id}')">Xem lớp</button>
              <div id="classes-${teacher.user_id}" style="margin-top: 5px;"></div>
            </td>
          `;
          tableBody.appendChild(tr);
        });
      };

      setupModalLogout();
      loadBtn.click(); // Tự động tải lúc đầu
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
  }


  // ========== Tải thông tin tài khoản admin ========== 
async function loadAdminInfo() {
  const { user_id } = getCurrentUser();
  const res = await fetch(`/info?user_id=${user_id}`);
  const json = await res.json();
  const data = json.data;
  const infoArea = document.getElementById("account-info");

  infoArea.innerHTML = `
    <div class="profile-container">
      <div class="info-view">
        <table class="info-table">
          <tr><th>Mã người dùng</th><td>${data.user_id}</td></tr>
          <tr><th>Họ tên</th><td>${data.name}</td></tr>
          <tr><th>Email</th><td>${data.email || "Chưa có"}</td></tr>
          <tr><th>Số điện thoại</th><td>${data.phone_number || "Chưa có"}</td></tr>
          <tr><th>Vai trò</th><td>${data.role}</td></tr>
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
    loadAdminInfo();
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
        setTimeout(loadAdminInfo, 1000);
      }
    } catch (err) {
      msg.textContent = "❌ Có lỗi xảy ra khi cập nhật!";
      msg.style.color = "red";
    }
  };
}

