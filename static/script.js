// 💡 Gửi POST JSON chuẩn
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

// 📌 Xử lý form đăng ký người dùng
const infoForm = document.getElementById("infoForm");
if (infoForm) {
  infoForm.onsubmit = async (e) => {
    e.preventDefault();
    const student_id = document.getElementById("student_id").value.trim();
    const name = document.getElementById("name").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    if (!student_id || !name || !password) {
      document.getElementById("infoMsg").textContent = "⚠ Vui lòng nhập đầy đủ thông tin.";
      return;
    }

    const result = await postJSON("/register_info", {
      student_id,
      name,
      password,
      role
    });

    document.getElementById("infoMsg").textContent = result.message;
  };
}

// 📸 Webcam + chụp ảnh và gửi đến API /upload_face
const video = document.getElementById("camera");
const captureFace = document.getElementById("captureFace");

if (video && captureFace) {
  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
  }).catch(err => {
    document.getElementById("faceMsg").textContent = "🚫 Không thể truy cập webcam.";
    console.error(err);
  });

  captureFace.onclick = async () => {
    const student_id = document.getElementById("student_id").value.trim();
    if (!student_id) {
      document.getElementById("faceMsg").textContent = "⚠ Vui lòng nhập mã người dùng trước.";
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

    document.getElementById("faceMsg").textContent = result.message;
  };
}
