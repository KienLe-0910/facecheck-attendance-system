// 💬 Hàm hiển thị thông báo
window.showMessage = function (id, message, success = true) {
  const p = document.getElementById(id);
  if (!p) return;
  p.textContent = message;
  p.style.color = success ? "green" : "red";
};

// 📤 Gửi POST JSON chuẩn REST
const postJSON = async (url, data) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  return res.json();
};

// 📝 Xử lý form đăng ký người dùng (dành cho register.html)
const infoForm = document.getElementById("infoForm");
if (infoForm) {
  infoForm.onsubmit = async (e) => {
    e.preventDefault();
    const student_id = document.getElementById("student_id").value.trim();
    const name = document.getElementById("name").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    if (!student_id || !name || !password) {
      showMessage("infoMsg", "⚠ Vui lòng nhập đầy đủ thông tin.", false);
      return;
    }

    const result = await postJSON("/register_info", {
      student_id,
      name,
      password,
      role
    });

    showMessage("infoMsg", result.message, result.success !== false);
  };
}

// 📸 Xử lý webcam + chụp ảnh (dành cho register.html)
const video = document.getElementById("camera");
const captureFace = document.getElementById("captureFace");

if (video && captureFace) {
  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
  }).catch(err => {
    showMessage("faceMsg", "🚫 Không thể truy cập webcam.", false);
    console.error(err);
  });

  captureFace.onclick = async () => {
    const student_id = document.getElementById("student_id").value.trim();
    if (!student_id) {
      showMessage("faceMsg", "⚠ Vui lòng nhập mã người dùng trước.", false);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const imageBase64 = canvas.toDataURL("image/jpeg");

    const result = await postJSON("/upload_face", {
      student_id,
      image_data: imageBase64
    });

    showMessage("faceMsg", result.message, result.success !== false);
  };
}
