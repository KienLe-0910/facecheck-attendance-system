import sqlite3
import hashlib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Khởi tạo router cho API login
router = APIRouter()

# Định nghĩa request model
class LoginRequest(BaseModel):
    student_id: str
    password: str

# Kết nối database
DB_PATH = "data/attendance.db"

def get_db_connection():
    """Trả về kết nối SQLite"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Trả về dữ liệu dạng dictionary
    return conn

@router.post("/login")
def login(request: LoginRequest):
    """API đăng nhập sinh viên"""
    student_id = request.student_id.strip()
    password = request.password.strip()

    if not student_id or not password:
        raise HTTPException(status_code=400, detail="⚠ Mã sinh viên và mật khẩu không được để trống!")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Kiểm tra sinh viên có tồn tại không
    cursor.execute("SELECT name, password FROM students WHERE student_id = ?", (student_id,))
    student = cursor.fetchone()

    conn.close()

    if not student:
        raise HTTPException(status_code=404, detail="⚠ Sinh viên không tồn tại!")

    # Hash mật khẩu nhập vào để so sánh
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    
    if hashed_password != student["password"]:
        raise HTTPException(status_code=401, detail="⚠ Mật khẩu không chính xác!")

    return {"success": True, "message": "✅ Đăng nhập thành công!", "student_name": student["name"]}
