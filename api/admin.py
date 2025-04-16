from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from models.db import get_db_connection
import bcrypt
from datetime import datetime
import pytz

router = APIRouter(prefix="/admin", tags=["admin"])

def get_current_vietnam_time():
    tz = pytz.timezone("Asia/Ho_Chi_Minh")
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

# --------- Schema để tạo giảng viên ---------
class CreateTeacherRequest(BaseModel):
    user_id: str
    name: str
    phone_number: str
    email: str
    password: str

# --------- API tạo tài khoản giảng viên ---------
@router.post("/create_teacher")
def create_teacher(user_data: CreateTeacherRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_data.user_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="❌ Mã giảng viên đã tồn tại.")

        hashed_pw = bcrypt.hashpw(user_data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        now = get_current_vietnam_time()

        cursor.execute("""
            INSERT INTO users (user_id, name, phone_number, email, password, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_data.user_id, user_data.name, user_data.phone_number, user_data.email, hashed_pw, "teacher", now))
        conn.commit()

        return {"success": True, "message": "✅ Đã tạo tài khoản giảng viên!"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo tài khoản: {e}")
    finally:
        conn.close()

# --------- API lấy danh sách giảng viên ---------
@router.get("/teachers")
def get_all_teachers():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id, name, phone_number, email, created_at FROM users WHERE role = 'teacher'")
        teachers = cursor.fetchall()
        return {
            "success": True,
            "data": [
                {"user_id": row["user_id"], "name": row["name"], "phone_number": row["phone_number"], "email": row["email"], "created_at": row["created_at"]}
                for row in teachers
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách giảng viên: {e}")
    finally:
        conn.close()

# --------- API lấy danh sách lớp của một giảng viên ---------
@router.get("/classes_of_teacher")
def get_classes_of_teacher(teacher_id: str = Query(..., alias="teacher_id")):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT class_id, class_name, created_at
            FROM classes
            WHERE teacher_id = ?
        """, (teacher_id,))
        classes = cursor.fetchall()
        return {
            "success": True,
            "data": [
                {"class_id": row["class_id"], "class_name": row["class_name"], "created_at": row["created_at"]}
                for row in classes
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy lớp của giảng viên: {e}")
    finally:
        conn.close()
