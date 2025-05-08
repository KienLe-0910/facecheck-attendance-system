// =============================
// ✅ Logic cho biometric.html
// =============================
if (window.location.pathname.endsWith("biometric.html")) {
  const video = document.getElementById("camera");
  const canvas = document.getElementById("overlay");
  const faceMsg = document.getElementById("faceStepMsg");
  const resetBtn = document.getElementById("resetCaptureBtn");
  const submitBtn = document.getElementById("submitRegisterBtn");

  let motionImages = {};
  let currentStep = 0;
  let captureCooldown = 0;
  let readyFrames = 0;
  const REQUIRED_FRAMES = 35;
  const steps = ["front", "left", "right"];

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

  async function initCamera() {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    return new Promise(resolve => {
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        resolve();
      };
    });
  }

  function stopCamera() {
    const stream = video.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
  }

  function resetFlow() {
    stopCamera();
    ["front", "left", "right"].forEach(pos => {
      const img = document.getElementById(`preview_${pos}`);
      if (img) img.src = "";
    });
    motionImages = {};
    currentStep = 0;
    readyFrames = 0;
    captureCooldown = 0;
    startLoop();
  }

  async function startLoop() {
    await initCamera();
    const ctx = canvas.getContext("2d");

    const loop = async () => {
      const detections = await faceapi
        .detectAllFaces(video, options)
        .withFaceLandmarks();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length === 1) {
        const det = detections[0];
        const box = det.detection.box;
        const landmarks = det.landmarks;

        ctx.strokeStyle = "lime";
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        const noseX = landmarks.getNose()[3].x;
        const eyeL = landmarks.getLeftEye()[0].x;
        const eyeR = landmarks.getRightEye()[3].x;
        const eyesMidX = (eyeL + eyeR) / 2;
        const offset = noseX - eyesMidX;

        const expected = steps[currentStep];
        let ok = false;

        if (expected === "front" && Math.abs(offset) < 10) ok = true;
        if (expected === "left" && offset < -20) ok = true;
        if (expected === "right" && offset > 20) ok = true;

        if (ok) {
          readyFrames++;
          if (faceMsg) {
            faceMsg.textContent = `👉 Bước ${currentStep + 1}/3: ${expected.toUpperCase()} ✅ (${readyFrames}/${REQUIRED_FRAMES})`;
          }

          if (readyFrames >= REQUIRED_FRAMES && captureCooldown === 0) {
            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = box.width;
            cropCanvas.height = box.height;
            const cropCtx = cropCanvas.getContext("2d");
            cropCtx.drawImage(
              video,
              box.x,
              box.y,
              box.width,
              box.height,
              0,
              0,
              box.width,
              box.height
            );
            motionImages[expected] = cropCanvas.toDataURL("image/jpeg");

            const imgEl = document.getElementById(`preview_${expected}`);
            if (imgEl) imgEl.src = motionImages[expected];

            currentStep++;
            captureCooldown = 60;
            readyFrames = 0;

            if (currentStep >= steps.length) {
              faceMsg.textContent = "✅ Đã hoàn tất chụp 3 góc!";
              stopCamera();
              submitBtn.disabled = false;
              return;
            }
          }
        } else {
          readyFrames = 0;
          if (faceMsg)
            faceMsg.textContent = `👉 Bước ${currentStep + 1}/3: ${expected.toUpperCase()} ❌`;
        }
      } else {
        readyFrames = 0;
        if (faceMsg)
          faceMsg.textContent = "⚠️ Vui lòng để đúng 1 khuôn mặt trong khung hình";
      }

      if (captureCooldown > 0) captureCooldown--;
      requestAnimationFrame(loop);
    };

    video.addEventListener("playing", loop, { once: true });
  }

  if (resetBtn) resetBtn.addEventListener("click", resetFlow);
  if (submitBtn) submitBtn.disabled = true;

  const startBtn = document.getElementById("startCaptureBtn");
  if (startBtn) startBtn.addEventListener("click", startLoop);

  // ✅ Gửi đăng ký sinh viên
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const registerData = JSON.parse(sessionStorage.getItem("register_data") || "{}");
      const user_id = registerData.user_id;
      const name = registerData.name;
      const password = registerData.password;
      const phone_number = registerData.phone_number;
      const email = registerData.email;
      const msg = document.getElementById("msg");

      if (!user_id || !motionImages.front || !motionImages.left || !motionImages.right) {
        msg.textContent = "⚠️ Thiếu dữ liệu đăng ký hoặc chưa hoàn tất quét khuôn mặt!";
        return;
      }

      try {
        const res = await fetch("/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id,
            name,
            password,
            phone_number,
            email,
            image_front: motionImages.front,
            image_left: motionImages.left,
            image_right: motionImages.right,
          }),
        });

        const result = await res.json();
        if (result.success) {
          msg.textContent = "✅ Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập...";
          msg.style.color = "green";
          sessionStorage.removeItem("register_data");
          stopCamera();
        
          setTimeout(() => {
            window.location.href = "/login.html";
          }, 3000);
        } else {
          msg.textContent = result.message || "❌ Đăng ký thất bại. Vui lòng thử lại.";
        }
      } catch (err) {
        msg.textContent = "❌ Lỗi kết nối khi gửi đăng ký.";
        console.error(err);
      }
    });
  }
}
