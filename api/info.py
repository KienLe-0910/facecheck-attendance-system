<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Thông tin tài khoản</title>
  <link rel="stylesheet" href="static/style.css" />
</head>
<body>
  <div class="container">
    <h2>👤 Thông tin tài khoản</h2>

    <div class="info-section">
      <p><strong>Mã người dùng:</strong> <span id="infoUserId">...</span></p>
      <p><strong>Tên hiển thị:</strong> <span id="infoUserName">...</span></p>
      <p><strong>Vai trò:</strong> <span id="infoUserRole">...</span></p>
      <p><strong>Số điện thoại:</strong> <span id="infoPhone">...</span></p>
      <p><strong>Ảnh cập nhật:</strong> <span id="infoUpdatedAt">...</span></p>
      <div class="avatar-preview">
        <img id="infoFaceImage" src="" alt="Ảnh khuôn mặt" style="max-width: 200px; border-radius: 12px;" />
      </div>
    </div>

    <hr />

    <div class="form-section">
      <h3>✏️ Cập nhật tên hiển thị</h3>
      <input type="text" id="newName" placeholder="Nhập tên mới" />
      <button onclick="updateName()">Cập nhật tên</button>
    </div>

    <div class="form-section">
        <h3>📱 Cập nhật số điện thoại</h3>
        <input type="text" id="newPhone" placeholder="Nhập số điện thoại mới" />
        <button onclick="updatePhone()">Cập nhật số điện thoại</button>
    </div>
      
    <div class="form-section">
      <h3>🔑 Đổi mật khẩu</h3>
      <input type="password" id="oldPassword" placeholder="Mật khẩu cũ" />
      <input type="password" id="newPassword" placeholder="Mật khẩu mới" />
      <button onclick="changePassword()">Đổi mật khẩu</button>
    </div>

    <div class="form-section">
      <h3>📷 Cập nhật ảnh khuôn mặt</h3>
      <input type="file" id="faceImageInput" accept="image/*" />
      <button onclick="updateFaceImage()">Cập nhật ảnh</button>
    </div>

    <div class="form-section">
      <button onclick="logout()">🚪 Đăng xuất</button>
    </div>
  </div>

  <script src="static/script.js"></script>
</body>
</html>
