from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.db import get_db_connection  # ✅ Sử dụng hàm chuẩn
import bcrypt

router = APIRouter()

class LoginRequest(BaseModel):
    user_id: str
    password: str

@router.post("/login")
def login(request: LoginRequest):
    user_id = request.user_id.strip()
    password = request.password.strip()

    if not user_id or not password:
        raise HTTPException(status_code=400, detail="⚠ Mã người dùng và mật khẩu không được để trống!")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name, password, role FROM users WHERE user_id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="⚠ Người dùng không tồn tại!")

    if not bcrypt.checkpw(password.encode('utf-8'), user["password"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="⚠ Mật khẩu không chính xác!")

    return {
        "success": True,
        "message": "✅ Đăng nhập thành công!",
        "user_id": user_id,
        "user_name": user["name"],
        "role": user["role"]
    }