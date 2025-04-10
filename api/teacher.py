from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from models.db import get_db_connection
from datetime import datetime
import pytz
import sqlite3

router = APIRouter()

# 📌 Định nghĩa schema cho dữ liệu phiên điểm danh
class SessionCreate(BaseModel):
    class_id: str
    start_time: str  # dạng 'YYYY-MM-DDTHH:MM'
    end_time: str

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

# 📌 API: Tạo phiên điểm danh mới cho lớp học phần (Dùng JSON body)
@router.post("/create_session")
def create_session(data: SessionCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        vn_tz = pytz.timezone("Asia/Ho_Chi_Minh")
        start_dt = vn_tz.localize(datetime.strptime(data.start_time, "%Y-%m-%dT%H:%M"))
        end_dt = vn_tz.localize(datetime.strptime(data.end_time, "%Y-%m-%dT%H:%M"))
        created_at = datetime.now(vn_tz).strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
            INSERT INTO sessions (class_id, start_time, end_time, created_at)
            VALUES (?, ?, ?, ?)
        """, (
            data.class_id,
            start_dt.strftime("%Y-%m-%d %H:%M:%S"),
            end_dt.strftime("%Y-%m-%d %H:%M:%S"),
            created_at
        ))
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

@router.get("/attendance_list_by_session")
def get_attendance_list_by_session(session_id: int, class_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT u.user_id, u.name, a.status, a.created_at
            FROM users u
            LEFT JOIN attendance a ON u.user_id = a.user_id
            LEFT JOIN enrollments e ON u.user_id = e.user_id
            WHERE a.session_id = ? AND e.class_id = ?
            ORDER BY u.name ASC
        """, (session_id, class_id))

        records = cursor.fetchall()

        if not records:
            return {"success": False, "message": "Không có dữ liệu điểm danh cho lớp và phiên này."}

        data = []
        for row in records:
            data.append({
                "user_id": row[0],
                "name": row[1],
                "status": row[2] if row[2] else "Chưa điểm danh",  # Nếu không có status thì mặc định "Chưa điểm danh"
                "created_at": row[3]
            })

        return {"success": True, "data": data}

    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()
