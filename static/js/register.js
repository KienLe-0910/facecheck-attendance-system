// =============================
// ✅ Logic cho register.html
// =============================

if (window.location.pathname.endsWith("register.html")) {
  const form = document.getElementById("registerForm");
  const msg = document.getElementById("registerMsg");

  form.onsubmit = (e) => {
    e.preventDefault();

    const user_id = document.getElementById("user_id").value.trim();
    const name = document.getElementById("name").value.trim();
    const password = document.getElementById("password").value;
    const phone_number = document.getElementById("phone_number").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!user_id || !name || !password || !phone_number || !email) {
      showMessage("registerMsg", "⚠️ Vui lòng nhập đầy đủ thông tin!", false);
      return;
    }

    // Lưu tạm toàn bộ thông tin vào sessionStorage dưới 1 key duy nhất
    const registerData = {
      user_id,
      name,
      password,
      phone_number,
      email
    };

    sessionStorage.setItem("register_data", JSON.stringify(registerData));

    // Điều hướng sang bước xác thực khuôn mặt
    window.location.href = "/biometric.html";
  };
}
