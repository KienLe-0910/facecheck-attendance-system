from fastapi import APIRouter, Query, HTTPException
from models.db import get_db_connection
from datetime import datetime
import pytz
import sqlite3

router = APIRouter()

# Hàm lấy giờ Việt Nam hiện tại dưới dạng chuỗi
def get_vietnam_time_str():
    vn_tz = pytz.timezone("Asia/Ho_Chi_Minh")
    vn_now = datetime.now(vn_tz)
    return vn_now.strftime("%Y-%m-%d %H:%M:%S")


# 📌 API: Lấy danh sách điểm danh theo lớp học phần và ngày
@router.get("/attendance_list")
def get_attendance_list(class_id: str, date: str = Query(..., regex=r"\d{4}-\d{2}-\d{2}")):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT class_name FROM classes WHERE class_id = ?", (class_id,))
        class_info = cursor.fetchone()
        if not class_info:
            return {"success": False, "message": "⚠ Không tìm thấy lớp học phần."}

        date_start = f"{date} 00:00:00"
        date_end = f"{date} 23:59:59"

        cursor.execute('''
            SELECT a.user_id, u.name, a.timestamp, a.status 
            FROM attendance a
            JOIN users u ON a.user_id = u.user_id
            WHERE a.class_id = ? AND a.timestamp BETWEEN ? AND ?
            ORDER BY a.timestamp ASC
        ''', (class_id, date_start, date_end))

        records = cursor.fetchall()

        attendance_list = [
            {
                "user_id": row["user_id"],
                "name": row["name"],
                "timestamp": row["timestamp"],
                "status": row["status"]
            }
            for row in records
        ]

        return {
            "success": True,
            "class_name": class_info["class_name"],
            "data": attendance_list
        }

    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}

    finally:
        conn.close()


# 📌 API: Tạo lớp học phần mới
@router.post("/create_class")
def create_class(class_id: str, class_name: str, teacher_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        created_at = get_vietnam_time_str()
        cursor.execute(
            "INSERT INTO classes (class_id, class_name, teacher_id, created_at) VALUES (?, ?, ?, ?)",
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


# 📌 API: Xóa lớp học phần
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
        classes = [
            {"class_id": row["class_id"], "class_name": row["class_name"]}
            for row in rows
        ]

        return {"success": True, "data": classes}

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


# 📌 API: Cập nhật thời gian bắt đầu điểm danh cho lớp học phần
@router.post("/set_class_time")
def set_class_time(class_id: str, start_time: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        try:
            vn_tz = pytz.timezone("Asia/Ho_Chi_Minh")
            dt = datetime.strptime(start_time, "%Y-%m-%dT%H:%M").astimezone(vn_tz)
        except ValueError:
            return {"success": False, "message": "⚠ Định dạng thời gian không hợp lệ!"}

        cursor.execute("UPDATE classes SET start_time = ? WHERE class_id = ?", (dt.strftime("%Y-%m-%d %H:%M:%S"), class_id))
        conn.commit()
        if cursor.rowcount == 0:
            return {"success": False, "message": "⚠ Không tìm thấy lớp học phần."}
        return {"success": True, "message": "✅ Đã cập nhật thời gian điểm danh."}

    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()
