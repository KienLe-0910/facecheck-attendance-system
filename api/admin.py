<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Trang quản trị - Tạo và quản lý giảng viên</title>
  <link rel="stylesheet" href="/static/style.css" />
  <script src="/static/script.js" defer></script>
</head>
<body>
  <div class="container">
    <h1>👨‍💼 Xin chào, <span id="admin-name">Admin</span></h1>

    <!-- TẠO TÀI KHOẢN GIẢNG VIÊN -->
    <section>
      <h2>➕ Tạo tài khoản giảng viên</h2>
      <form id="create-teacher-form">
        <label for="user_id">Mã giảng viên:</label><br />
        <input type="text" id="user_id" required /><br /><br />

        <label for="name">Họ tên:</label><br />
        <input type="text" id="name" required /><br /><br />

        <label for="password">Mật khẩu:</label><br />
        <input type="password" id="password" required /><br /><br />

        <button type="submit">Tạo tài khoản</button>
      </form>
      <p id="message" style="margin-top: 20px; font-weight: bold;"></p>
    </section>

    <hr><br>

    <!-- XEM DANH SÁCH GIẢNG VIÊN -->
    <section>
      <h2>📋 Danh sách giảng viên</h2>
      <button id="load-teachers">🔄 Tải danh sách</button>
      <div id="teachers-list" style="margin-top: 20px;"></div>
    </section>

    <br>
    <button id="logout-btn">🚪 Đăng xuất</button>
  </div>
</body>
</html>
