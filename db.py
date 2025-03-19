import sqlite3

# Kết nối hoặc tạo database
conn = sqlite3.connect("project-03/data/attendance.db")
cursor = conn.cursor()

# Tạo bảng lưu danh sách sinh viên
cursor.execute("""
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT
)
""")

# Tạo bảng lưu mã hóa khuôn mặt
cursor.execute("""
CREATE TABLE IF NOT EXISTS face_encodings (
    student_id TEXT PRIMARY KEY,
    encoding BLOB,
    FOREIGN KEY (student_id) REFERENCES students(id)
)
""")

# Bảng lưu log điểm danh
cursor.execute("""
CREATE TABLE IF NOT EXISTS attendance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT,
    name TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")

conn.commit()
conn.close()
print("✅ Database đã được khởi tạo!")