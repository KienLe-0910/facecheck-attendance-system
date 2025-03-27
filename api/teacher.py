from fastapi import APIRouter, HTTPException, Query
from models.db import get_db_connection
from datetime import datetime
import pytz
import sqlite3

router = APIRouter()

# 📌 API: Tạo lớp học phần mới
@router.post("/create_class")
def create_class(class_id: str, class_name: str, teacher_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        created_at = datetime.now(pytz.timezone("Asia/Ho_Chi_Minh")).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO classes (class_id, class_name, teacher_id, created_at)
            VALUES (?, ?, ?, ?)""",
            (class_id, class_name, teacher_id, created_at)
        )
        conn.commit()
        return {"success": True, "message": "✅ Lớp học phần được tạo thành công!"}
    except sqlite3.IntegrityError:
        return {"success": False, "message": "⚠ Mã lớp học phần đã tồn tại!"}
    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()

# 📌 API: Xoá lớp học phần
@router.delete("/delete_class")
def delete_class(class_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM enrollments WHERE class_id = ?", (class_id,))
        if cursor.fetchone()[0] > 0:
            return {"success": False, "message": "⚠ Không thể xoá lớp có sinh viên đã đăng ký!"}

        cursor.execute("DELETE FROM classes WHERE class_id = ?", (class_id,))
        conn.commit()
        return {"success": True, "message": "✅ Lớp học phần đã được xoá!"}
    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()

# 📌 API: Lấy danh sách lớp học phần của giảng viên
@router.get("/get_classes_by_teacher")
def get_classes_by_teacher(teacher_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT class_id, class_name FROM classes
            WHERE teacher_id = ?
            ORDER BY class_id ASC
        """, (teacher_id,))
        rows = cursor.fetchall()
        data = [dict(row) for row in rows]
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()

# 📌 API: Cập nhật tên lớp học phần
@router.put("/update_class_name")
def update_class_name(class_id: str, class_name: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE classes SET class_name = ? WHERE class_id = ?", (class_name, class_id))
        if cursor.rowcount == 0:
            return {"success": False, "message": "⚠ Không tìm thấy lớp học phần để cập nhật!"}
        conn.commit()
        return {"success": True, "message": "✅ Đã cập nhật tên lớp học phần!"}
    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()

# 📌 API: Tạo phiên điểm danh mới cho lớp học phần
@router.post("/create_session")
def create_session(class_id: str, start_time: str, end_time: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        try:
            start_dt = datetime.strptime(start_time, "%Y-%m-%dT%H:%M")
            end_dt = datetime.strptime(end_time, "%Y-%m-%dT%H:%M")
            vn_start = start_dt + pytz.timezone("Asia/Ho_Chi_Minh").utcoffset(start_dt)
            vn_end = end_dt + pytz.timezone("Asia/Ho_Chi_Minh").utcoffset(end_dt)
        except ValueError:
            return {"success": False, "message": "⚠ Định dạng thời gian không hợp lệ!"}

        created_at = datetime.now(pytz.timezone("Asia/Ho_Chi_Minh")).strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
            INSERT INTO sessions (class_id, start_time, end_time, created_at)
            VALUES (?, ?, ?, ?)""",
            (class_id, vn_start.strftime("%Y-%m-%d %H:%M:%S"), vn_end.strftime("%Y-%m-%d %H:%M:%S"), created_at)
        )
        conn.commit()
        return {"success": True, "message": "✅ Phiên điểm danh đã được tạo!"}
    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()

# 📌 API: Lấy danh sách phiên điểm danh theo class_id
@router.get("/get_sessions")
def get_sessions(class_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, start_time, end_time, created_at FROM sessions
            WHERE class_id = ?
            ORDER BY start_time DESC
        """, (class_id,))
        rows = cursor.fetchall()
        data = [dict(row) for row in rows]
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()

# 📌 API: Lấy danh sách điểm danh theo session
@router.get("/attendance_list_by_session")
def get_attendance_list_by_session(session_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT a.user_id, u.name, a.timestamp, a.status
            FROM attendance a
            JOIN users u ON a.user_id = u.user_id
            WHERE a.session_id = ?
            ORDER BY a.timestamp ASC
        """, (session_id,))
        records = cursor.fetchall()
        data = [dict(row) for row in records]
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()
