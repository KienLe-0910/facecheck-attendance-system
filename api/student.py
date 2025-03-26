from fastapi import APIRouter, HTTPException, Query
from models.db import get_db_connection

router = APIRouter()

# 📌 API: Lấy thông tin sinh viên
@router.get("/student_info")
def get_student_info(student_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT student_id, name, role FROM students WHERE student_id = ?", (student_id,))
        row = cursor.fetchone()
        if row:
            return {"success": True, "data": dict(row)}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    finally:
        conn.close()


# 📌 API: Lấy danh sách lớp học phần đã đăng ký của sinh viên
@router.get("/get_student_classes")
def get_student_classes(student_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT c.class_id, c.class_name
            FROM student_classes sc
            JOIN classes c ON sc.class_id = c.class_id
            WHERE sc.student_id = ?
            ORDER BY c.class_id ASC
        """, (student_id,))
        rows = cursor.fetchall()
        classes = [dict(row) for row in rows]
        return {"success": True, "data": classes}
    finally:
        conn.close()


# 📌 API: Lấy lịch sử điểm danh của sinh viên theo lớp học phần
@router.get("/student_attendance_history")
def get_attendance_history(student_id: str, class_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT timestamp, status FROM attendance
            WHERE student_id = ? AND class_id = ?
            ORDER BY timestamp DESC
        """, (student_id, class_id))
        rows = cursor.fetchall()
        history = [dict(row) for row in rows]
        return {"success": True, "data": history}
    finally:
        conn.close()


# 📌 API: Huỷ đăng ký lớp học phần
@router.delete("/unenroll_class")
def unenroll_class(student_id: str, class_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM student_classes
            WHERE student_id = ? AND class_id = ?
        """, (student_id, class_id))
        conn.commit()
        if cursor.rowcount == 0:
            return {"success": False, "message": "⚠ Bạn chưa đăng ký lớp này hoặc đã huỷ trước đó."}
        return {"success": True, "message": "✅ Đã huỷ đăng ký lớp học phần."}
    finally:
        conn.close()