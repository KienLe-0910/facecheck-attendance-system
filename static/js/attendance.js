// =============================
// ✅ Logic cho attendance.html (v2 final)
// =============================

if (window.location.pathname.endsWith("attendance.html")) {
  const video = document.getElementById("camera");
  const canvas = document.getElementById("overlay");
  const faceMsg = document.getElementById("faceStepMsg");
  const previewFront = document.getElementById("preview_front");
  const previewLeft = document.getElementById("preview_left");
  const previewRight = document.getElementById("preview_right");
  const resetBtn = document.getElementById("resetCaptureBtn");
  const submitBtn = document.getElementById("submitRegisterBtn");

  let motionImages = {};
  let currentStep = 0;
  let captureCooldown = 0;
  let readyFrames = 0;
  const REQUIRED_FRAMES = 35;
  const steps = ["front", "left", "right"];

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

  // Tải danh sách phiên điểm danh
  window.onload = async function () {
    const sessionSelect = document.getElementById("session_id");
    const { user_id } = getCurrentUser();
    const res = await fetch(`/get_available_sessions?user_id=${user_id}`);
    const result = await res.json();

    if (result.success && Array.isArray(result.data)) {
      result.data.forEach((s) => {
        const option = document.createElement("option");
        option.value = s.session_id;
        option.textContent = `Mã lớp: ${s.class_id} | Phiên điểm danh: ${s.start_time} - ${s.end_time}`;
        sessionSelect.appendChild(option);
      });
    } else {
      const msg = document.getElementById("msg");
      msg.textContent = result.message || "Không có phiên khả dụng.";
      msg.style.color = "crimson";
    }
  };

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
      const detections = await faceapi.detectAllFaces(video, options).withFaceLandmarks();
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
          faceMsg.textContent = `👉 Bước ${currentStep + 1}/3: ${expected.toUpperCase()} ✅ (${readyFrames}/${REQUIRED_FRAMES})`;

          if (readyFrames >= REQUIRED_FRAMES && captureCooldown === 0) {
            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = box.width;
            cropCanvas.height = box.height;
            const cropCtx = cropCanvas.getContext("2d");
            cropCtx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
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
          faceMsg.textContent = `👉 Bước ${currentStep + 1}/3: ${expected.toUpperCase()} ❌`;
        }
      } else {
        readyFrames = 0;
        faceMsg.textContent = "⚠️ Vui lòng để đúng 1 khuôn mặt trong khung hình";
      }

      if (captureCooldown > 0) captureCooldown--;
      requestAnimationFrame(loop);
    };

    video.addEventListener("playing", loop, { once: true });
  }

  // Bắt đầu
  const startBtn = document.getElementById("startCaptureBtn");
  if (startBtn) startBtn.addEventListener("click", startLoop);
  if (resetBtn) resetBtn.addEventListener("click", resetFlow);
  if (submitBtn) submitBtn.disabled = true;

  // Gửi điểm danh
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const { user_id } = getCurrentUser();
      const session_id = document.getElementById("session_id").value;
      const msg = document.getElementById("msg");

      if (!motionImages.front || !motionImages.left || !motionImages.right) {
        msg.textContent = "⚠️ Bạn chưa hoàn tất quét khuôn mặt 3 hướng!";
        msg.style.color = "crimson";
        return;
      }

      const formData = new FormData();
      formData.append("user_id", user_id);
      formData.append("session_id", session_id);
      formData.append("image_front", motionImages.front);
      formData.append("image_left", motionImages.left);
      formData.append("image_right", motionImages.right);

      try {
        const res = await fetch("/attendance", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();
        msg.textContent = result.message || "✅ Gửi điểm danh thành công!";
        msg.style.color = result.success ? "#16a34a" : "crimson";
      } catch (err) {
        msg.textContent = "❌ Lỗi kết nối khi gửi điểm danh.";
        msg.style.color = "crimson";
        console.error(err);
      }
    });
  }
}
