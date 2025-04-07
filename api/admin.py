from fastapi import APIRouter, HTTPException
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
    password: str

# --------- API tạo tài khoản giảng viên ---------
@router.post("/create_teacher")
def create_teacher(user_data: CreateTeacherRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Kiểm tra trùng ID
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_data.user_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="❌ Mã giảng viên đã tồn tại.")

        hashed_pw = bcrypt.hashpw(user_data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        now = get_current_vietnam_time()

        cursor.execute("""
            INSERT INTO users (user_id, name, password, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (user_data.user_id, user_data.name, hashed_pw, "teacher", now))
        conn.commit()

        return {"success": True, "message": "✅ Đã tạo tài khoản giảng viên!"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo tài khoản: {e}")
    
    finally:
        conn.close()
