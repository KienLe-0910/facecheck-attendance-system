// Gửi JSON tới API
async function postJSON(url, data) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: "❌ Không kết nối được đến server!" };
  }
}

// Gửi FormData (cho upload ảnh, file)
async function postForm(url, formData) {
  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: "❌ Không kết nối được đến server!" };
  }
}

// Hiển thị thông báo
function showMessage(id, text, success = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = success ? "green" : "red";
}

// Mở camera
function startCamera() {
  const video = document.getElementById("video");
  if (!video) return;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => {
      console.error("Không thể truy cập camera:", err);
      showMessage("faceMsg", "⚠ Không thể bật camera!", false);
    });
}

// Chụp ảnh từ webcam → base64
function captureImage() {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  if (!video || !canvas) return "";

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg");
}

// Đăng xuất (xoá localStorage + về login)
function logout() {
  localStorage.clear();
  window.location.href = "/login.html";
}

// Lấy thông tin người dùng đang đăng nhập
function getCurrentUser() {
  return {
    user_id: localStorage.getItem("user_id"),
    user_name: localStorage.getItem("user_name"),
    role: localStorage.getItem("role")
  };
}
