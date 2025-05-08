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
// ✅ Mở modal xác nhận đăng xuất
window.showModalLogout = function() {
  document.getElementById("modal-logout").style.display = "flex";
};

// ✅ Đóng modal xác nhận đăng xuất
window.closeModalLogout = function() {
  document.getElementById("modal-logout").style.display = "none";
};

// ✅ Gán hành vi nút 'Đăng xuất'
window.setupModalLogout = function() {
  const confirmBtn = document.getElementById("modal-logout-confirm");
  if (confirmBtn) {
    confirmBtn.onclick = function() {
      logout(); // ⬅️ Gọi logout() như cũ
    };
  }
};

  // =============================
// ✅ Khởi tạo sau khi DOM sẵn sàng (KHÔNG tự bật camera)
// =============================
window.addEventListener("DOMContentLoaded", () => {
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
  
    // ✅ 2. Reset motion face capture (nếu có nút)
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
  });