from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from models.db import get_db_connection
import bcrypt
from datetime import datetime
import pytz

router = APIRouter(prefix="/admin", tags=["admin"])

def get_current_vietnam_time():
    tz = pytz.timezone("Asia/Ho_Chi_Minh")
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

# Hàm xác thực người dùng từ session
def get_current_user(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập.")
    return user

# --------- Schema để tạo giảng viên ---------
class CreateTeacherRequest(BaseModel):
    user_id: str
    name: str
    password: str

# --------- API tạo tài khoản giảng viên ---------
@router.post("/create_teacher")
def create_teacher(request: Request, 
                   user_data: CreateTeacherRequest, 
                   current_user: dict = Depends(get_current_user)):

    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện chức năng này.")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Kiểm tra trùng ID
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_data.user_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User ID đã tồn tại.")

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