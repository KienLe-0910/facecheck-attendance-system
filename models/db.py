import sqlite3
import os
import bcrypt
from datetime import datetime
import pytz

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "../data/attendance.db")

def get_current_vietnam_time():
    """Lấy thời gian hiện tại theo múi giờ Việt Nam"""
    tz = pytz.timezone("Asia/Ho_Chi_Minh")
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Tạo bảng Users
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT CHECK(role IN ('student', 'teacher')) NOT NULL DEFAULT 'student',
                embedding BLOB,
                created_at TEXT
            )
        ''')

        # Tạo bảng Điểm danh
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                class_id TEXT NOT NULL,
                timestamp TEXT,
                status TEXT CHECK(status IN ('on-time', 'late')) NOT NULL,
                created_at TEXT
            )
        ''')

        # Tạo bảng Lớp học phần
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id TEXT UNIQUE NOT NULL,
                class_name TEXT NOT NULL,
                teacher_id TEXT NOT NULL,
                start_time TEXT,
                created_at TEXT
            )
        ''')

        # Tạo bảng đăng ký
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                class_id TEXT NOT NULL,
                created_at TEXT,
                UNIQUE(user_id, class_id)
            )
        ''')

        conn.commit()
        print("[INFO] Database initialized successfully!")

    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")

    finally:
        if 'conn' in locals():
            conn.close()

# Chạy khi import
init_db()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_admin_account():
    conn = get_db_connection()
    cursor = conn.cursor()

    teacher_id = "admin"
    teacher_name = "Giảng viên Admin"
    password = "admin123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (teacher_id,))
        if not cursor.fetchone():
            now = get_current_vietnam_time()
            cursor.execute("""
                INSERT INTO users (user_id, password, name, role, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (teacher_id, hashed_password, teacher_name, "teacher", now))
            conn.commit()
            print("[INFO] Admin account created: admin / admin123")

    except Exception as e:
        print(f"[ERROR] Failed to create admin account: {e}")

    finally:
        conn.close()

create_admin_account()