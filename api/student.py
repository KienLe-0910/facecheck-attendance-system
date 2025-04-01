from fastapi import APIRouter, HTTPException
from models.db import get_db_connection

router = APIRouter()

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


# 📌 API: Lấy danh sách lớp học phần đã đăng ký của người dùng
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
        classes = [dict(row) for row in rows]
        return {"success": True, "data": classes}
    finally:
        conn.close()


# 📌 API: Lấy lịch sử điểm danh của người dùng theo lớp học phần
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
        history = [dict(row) for row in rows]
        return {"success": True, "data": history}
    finally:
        conn.close()


# 📌 API: Huỷ đăng ký lớp học phần
@router.delete("/unenroll_class")
def unenroll_class(user_id: str, class_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM enrollments
            WHERE user_id = ? AND class_id = ?
        """, (user_id, class_id))
        conn.commit()
        if cursor.rowcount == 0:
            return {"success": False, "message": "⚠ Bạn chưa đăng ký lớp này hoặc đã huỷ trước đó."}
        return {"success": True, "message": "✅ Đã huỷ đăng ký lớp học phần."}
    finally:
        conn.close()
