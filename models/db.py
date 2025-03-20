import sqlite3
import os
import bcrypt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Lấy thư mục models/
DB_PATH = os.path.join(BASE_DIR, "../data/attendance.db")  # Dẫn lên thư mục data/

def init_db():
    """Khởi tạo database và tạo bảng nếu chưa có"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Tạo bảng Sinh viên
        cursor.execute('''CREATE TABLE IF NOT EXISTS students (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            student_id TEXT UNIQUE NOT NULL,
                            password TEXT NOT NULL,
                            name TEXT NOT NULL,
                            role TEXT CHECK(role IN ('student', 'teacher')) NOT NULL DEFAULT 'student',
                            embedding BLOB
                         )''')
        
        # Tạo bảng Điểm danh
        cursor.execute('''CREATE TABLE IF NOT EXISTS attendance (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            student_id TEXT NOT NULL,
                            class_id TEXT NOT NULL,
                            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                            status TEXT CHECK(status IN ('on-time', 'late')) NOT NULL
                         )''')

        # Tạo bảng Lớp học phần
        cursor.execute('''CREATE TABLE IF NOT EXISTS classes (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            class_id TEXT UNIQUE NOT NULL,
                            class_name TEXT NOT NULL,
                            teacher_id TEXT NOT NULL
                         )''')

        # Tạo bảng Sinh viên - Lớp học phần (quan hệ nhiều - nhiều)
        cursor.execute('''CREATE TABLE IF NOT EXISTS student_classes (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            student_id TEXT NOT NULL,
                            class_id TEXT NOT NULL,
                            UNIQUE(student_id, class_id)
                         )''')

        conn.commit()
        print("[INFO] Database initialized successfully!")

    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")

    finally:
        if 'conn' in locals():
            conn.close()

# Chạy hàm khởi tạo database khi import
init_db()

def get_db_connection():
    """Trả về kết nối SQLite với row_factory để dễ truy vấn dữ liệu"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Trả về dạng dictionary thay vì tuple
    return conn

def create_admin_account():
    """Tạo tài khoản giảng viên mặc định nếu chưa có"""
    conn = get_db_connection()
    cursor = conn.cursor()

    teacher_id = "admin"
    teacher_name = "Giảng viên Admin"
    password = "admin123"  # Mật khẩu mặc định
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        cursor.execute("SELECT * FROM students WHERE student_id = ?", (teacher_id,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO students (student_id, password, name, role) VALUES (?, ?, ?, ?)",
                           (teacher_id, hashed_password, teacher_name, "teacher"))
            conn.commit()
            print("[INFO] Admin account created: admin / admin123")

    except Exception as e:
        print(f"[ERROR] Failed to create admin account: {e}")

    finally:
        conn.close()

# Chạy hàm tạo tài khoản admin khi import
create_admin_account()