from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from models.db import get_db_connection
from datetime import datetime
import pytz
import sqlite3
from openpyxl import Workbook
import io
from fastapi.responses import StreamingResponse

router = APIRouter()

# 📌 Định nghĩa schema cho dữ liệu phiên điểm danh
class SessionCreate(BaseModel):
    class_id: str
    start_time: str  # dạng 'YYYY-MM-DDTHH:MM'
    end_time: str
    ontime_limit: int = 10

# 📌 API: Tạo lớp học phần mới
@router.post("/create_class")
def create_class(class_id: str, class_name: str, teacher_id: str, class_key: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        created_at = datetime.now(pytz.timezone("Asia/Ho_Chi_Minh")).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO classes (class_id, class_name, teacher_id, class_key, created_at)
            VALUES (?, ?, ?, ?, ?)""",
            (class_id, class_name, teacher_id, class_key, created_at)
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
            SELECT class_id, class_name, class_key, created_at FROM classes
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
class UpdateClassRequest(BaseModel):
    class_id: str
    class_name: str
    class_key: str

@router.post("/update_class")
def update_class(data: UpdateClassRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE classes 
            SET class_name = ?, class_key = ?
            WHERE class_id = ?
        """, (data.class_name, data.class_key, data.class_id))
        
        if cursor.rowcount == 0:
            return {"success": False, "message": "⚠ Không tìm thấy lớp để cập nhật!"}
        
        conn.commit()
        return {"success": True, "message": "✅ Đã cập nhật lớp học phần!"}
    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()

# 📌 API: Xem sinh viên của lớp
@router.get("/teacher/students")
def get_students_by_class(class_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT u.user_id, u.name, u.email, u.phone_number
            FROM users u
            JOIN enrollments e ON u.user_id = e.user_id
            WHERE e.class_id = ?
        """, (class_id,))
        rows = cursor.fetchall()
        data = [dict(row) for row in rows]
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        conn.close()

# 📌 API: Xoá sinh viên khỏi lớp
@router.delete("/remove_student_from_class")
def remove_student_from_class(class_id: str, user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM enrollments WHERE class_id = ? AND user_id = ?", (class_id, user_id))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên trong lớp.")
        return {"success": True, "message": f"✅ Đã xoá sinh viên {user_id} khỏi lớp {class_id}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
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
            INSERT INTO sessions (class_id, start_time, end_time, created_at, ontime_limit)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data.class_id,
            start_dt.strftime("%Y-%m-%d %H:%M:%S"),
            end_dt.strftime("%Y-%m-%d %H:%M:%S"),
            created_at,
            data.ontime_limit
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
            SELECT id, start_time, end_time, created_at, ontime_limit
            FROM sessions
            WHERE class_id = ?
            ORDER BY created_at ASC
        """, (class_id,))

        records = cursor.fetchall()

        if not records:
            return {"success": False, "message": "Không có phiên nào."}

        data = []
        for row in records:
            data.append({
                "session_id": row[0],
                "start_time": row[1],
                "end_time": row[2],
                "created_at": row[3],
                "ontime_limit": row[4]
            })

        return {"success": True, "data": data}

    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        conn.close()

@router.get("/attendance_list_by_session")
def get_attendance_list_by_session(
    session_id: int = Query(..., description="Session ID bắt buộc"),
    class_id: str = Query(..., description="Class ID bắt buộc")
):
    if session_id is None or class_id is None or str(session_id) == "undefined" or class_id == "undefined":
        raise HTTPException(status_code=400, detail="Thiếu hoặc sai session_id / class_id!")

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
            return {"success": False, "message": "⚠ Không có dữ liệu điểm danh cho lớp và phiên này."}

        data = []
        for row in records:
            data.append({
                "user_id": row[0],
                "name": row[1],
                "status": row[2] if row[2] else "Chưa điểm danh",
                "created_at": row[3]
            })

        return {"success": True, "data": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")

    finally:
        conn.close()

class EnrollRequest(BaseModel):
    class_id: str
    user_id: str

@router.post("/add_student_to_class")
def add_student_to_class(data: EnrollRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Kiểm tra lớp học tồn tại
        cursor.execute("SELECT 1 FROM classes WHERE class_id = ?", (data.class_id,))
        if not cursor.fetchone():
            return {"success": False, "message": "⚠️ Lớp học không tồn tại!"}

        # Kiểm tra sinh viên tồn tại
        cursor.execute("SELECT 1 FROM users WHERE user_id = ? AND role = 'student'", (data.user_id,))
        if not cursor.fetchone():
            return {"success": False, "message": "⚠️ Mã sinh viên không hợp lệ!"}

        # Kiểm tra đã đăng ký chưa
        cursor.execute("SELECT 1 FROM enrollments WHERE class_id = ? AND user_id = ?", (data.class_id, data.user_id))
        if cursor.fetchone():
            return {"success": False, "message": "⚠️ Sinh viên đã đăng ký lớp này!"}

        # Thêm vào enrollments
        cursor.execute("INSERT INTO enrollments (class_id, user_id) VALUES (?, ?)", (data.class_id, data.user_id))
        conn.commit()
        return {"success": True, "message": "✅ Đã thêm sinh viên vào lớp!"}

    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()
        
@router.get("/export_attendance_excel")
def export_attendance_excel(session_id: int, class_id: str):
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
            raise HTTPException(status_code=404, detail="Không có dữ liệu điểm danh")

        wb = Workbook()
        ws = wb.active
        ws.title = "Danh sách điểm danh"

        # Header
        ws.append(["Mã SV", "Họ tên", "Trạng thái", "Thời gian"])

        # Data
        for row in records:
            ws.append([
                row[0],
                row[1],
                row[2] if row[2] else "Chưa điểm danh",
                row[3]
            ])

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        headers = {"Content-Disposition": f"attachment; filename=attendance_{class_id}_session{session_id}.xlsx"}
        return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()
