from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from models.db import get_db_connection
from datetime import datetime
import pytz

router = APIRouter()

# 📌 MODEL: Yêu cầu đăng ký lớp học
class EnrollRequest(BaseModel):
    user_id: str
    class_id: str

# 📌 API: Lấy thông tin người dùng
@router.get("/student_info")
def get_student_info(user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT user_id, name, role FROM users WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            return {"success": True, "data": dict(row)}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    finally:
        conn.close()

# 📌 API: Lấy danh sách lớp học phần đã đăng ký
@router.get("/get_student_classes")
def get_student_classes(user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT c.class_id, c.class_name
            FROM enrollments e
            JOIN classes c ON e.class_id = c.class_id
            WHERE e.user_id = ?
            ORDER BY c.class_id ASC
        """, (user_id,))
        rows = cursor.fetchall()
        return {"success": True, "data": [dict(row) for row in rows]}
    finally:
        conn.close()

# 📌 API: Lịch sử điểm danh theo lớp
@router.get("/student_attendance_history")
def get_attendance_history(user_id: str, class_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT a.created_at, a.status, s.id AS session_id
            FROM attendance a
            JOIN sessions s ON a.session_id = s.id
            WHERE a.user_id = ? AND s.class_id = ?
            ORDER BY a.created_at DESC
        """, (user_id, class_id))
        rows = cursor.fetchall()
        return {"success": True, "data": [dict(row) for row in rows]}
    finally:
        conn.close()

# 📌 API: Đăng ký vào lớp học phần
@router.post("/enroll_class")
def enroll_class(req: EnrollRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        print(f"[INFO] Nhận yêu cầu đăng ký: user_id={req.user_id}, class_id={req.class_id}")
        cursor.execute("SELECT * FROM classes WHERE class_id = ?", (req.class_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="❌ Lớp học phần không tồn tại!")

        cursor.execute("SELECT * FROM enrollments WHERE user_id = ? AND class_id = ?",
                       (req.user_id, req.class_id))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="⚠️ Bạn đã đăng ký lớp này rồi!")

        vn_time = datetime.now(pytz.timezone("Asia/Ho_Chi_Minh")).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("INSERT INTO enrollments (user_id, class_id, created_at) VALUES (?, ?, ?)",
                       (req.user_id, req.class_id, vn_time))
        conn.commit()

        return {"success": True, "message": "✅ Đăng ký lớp học phần thành công!"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[ERROR] Lỗi khi đăng ký: {e}")
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()

# 📌 API: Huỷ đăng ký lớp học phần
@router.delete("/unenroll_class")
def unenroll_class(user_id: str, class_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM enrollments WHERE user_id = ? AND class_id = ?",
                       (user_id, class_id))
        conn.commit()
        if cursor.rowcount == 0:
            return {"success": False, "message": "⚠ Bạn chưa đăng ký lớp này hoặc đã huỷ trước đó."}
        return {"success": True, "message": "✅ Đã huỷ đăng ký lớp học phần."}
    finally:
        conn.close()
