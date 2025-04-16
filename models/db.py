import sqlite3
import os
import bcrypt
from datetime import datetime
import pytz

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "../data/attendance.db")

def get_current_time():
    return datetime.now(pytz.timezone("Asia/Ho_Chi_Minh")).strftime("%Y-%m-%d %H:%M:%S")

def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Bảng người dùng (motion-based)
        cursor.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT CHECK(role IN ('student', 'teacher', 'admin')) NOT NULL DEFAULT 'student',
            email TEXT,
            phone_number TEXT,
            embedding_front BLOB,
            embedding_left BLOB,
            embedding_right BLOB,
            face_image_path_front TEXT,
            face_image_path_left TEXT,
            face_image_path_right TEXT,
            created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
            updated_at TEXT
        )''')

        # Bảng lớp học phần
        cursor.execute('''CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id TEXT UNIQUE NOT NULL,
            class_name TEXT NOT NULL,
            teacher_id TEXT NOT NULL,
            created_at TEXT
        )''')

        # Bảng đăng ký lớp học phần
        cursor.execute('''CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            class_id TEXT NOT NULL,
            created_at TEXT,
            UNIQUE(user_id, class_id)
        )''')

        # Bảng phiên điểm danh
        cursor.execute('''CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            created_at TEXT NOT NULL
        )''')

        # Bảng điểm danh
        cursor.execute('''CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            session_id INTEGER NOT NULL,
            status TEXT CHECK(status IN ('on-time', 'late')) NOT NULL,
            created_at TEXT NOT NULL
        )''')

        conn.commit()
        print("[INFO] Database initialized successfully!")
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_admin_account():
    conn = get_db_connection()
    cursor = conn.cursor()

    admin_id = "admin1"
    admin_name = "Admin 1"
    password = "codeadmin1"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (admin_id,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO users (user_id, password, name, role, created_at) VALUES (?, ?, ?, ?, ?)",
                           (admin_id, hashed_password, admin_name, "admin", get_current_time()))
            conn.commit()
            print("[INFO] Admin account created: admin1 / codeadmin1")
    except Exception as e:
        print(f"[ERROR] Failed to create admin account: {e}")
    finally:
        conn.close()

# Khởi tạo DB và tài khoản admin
init_db()
create_admin_account()
