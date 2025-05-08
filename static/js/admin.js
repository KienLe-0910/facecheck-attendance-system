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
  