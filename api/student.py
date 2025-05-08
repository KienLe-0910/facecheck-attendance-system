from fastapi import APIRouter, HTTPException, UploadFile, File, Body, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from models.db import get_db_connection
from uuid import uuid4
from datetime import datetime
import pytz
import os
import bcrypt
import sqlite3

router = APIRouter()
UPLOAD_FOLDER = "face_images"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 📌 MODEL: Yêu cầu đăng ký lớp học
class EnrollRequest(BaseModel):
    user_id: str
    class_id: str
    class_key: str

# 📌 API: Lấy thông tin người dùng
@router.get("/info")
def get_info(user_id: str = Query(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT user_id, name, role, phone_number, email,
                   face_image_path_front, face_image_path_left, face_image_path_right,
                   updated_at 
            FROM users WHERE user_id = ?
        """, (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        data = {key: row[key] for key in row.keys()}
        data["face_image_path"] = row["face_image_path_front"]
        return {"success": True, "data": data}
    finally:
        conn.close()

@router.post("/info/update_name")
def update_name(user_id: str = Body(...), new_name: str = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    updated_time = datetime.now().isoformat(" ", "seconds")
    try:
        cursor.execute(
            "UPDATE users SET name = ?, updated_at = ? WHERE user_id = ?",
            (new_name, updated_time, user_id)
        )
        conn.commit()
        return {"message": "Cập nhật tên thành công."}
    finally:
        conn.close()


class ChangePasswordRequest(BaseModel):
    user_id: str
    old_password: str
    new_password: str

@router.post("/info/change_password")
def change_password(payload: ChangePasswordRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT password FROM users WHERE user_id = ?", (payload.user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        hashed_password = row[0]
        if not bcrypt.checkpw(payload.old_password.encode(), hashed_password.encode()):
            raise HTTPException(status_code=400, detail="Mật khẩu cũ không đúng.")

        new_hashed = bcrypt.hashpw(payload.new_password.encode(), bcrypt.gensalt()).decode()
        updated_time = datetime.now().isoformat(" ", "seconds")
        cursor.execute(
            "UPDATE users SET password = ?, updated_at = ? WHERE user_id = ?",
            (new_hashed, updated_time, payload.user_id)
        )
        conn.commit()
        return {"success": True, "message": "Mật khẩu đã được thay đổi."}
    finally:
        conn.close()


@router.post("/info/update_face")
def update_face(user_id: str = Query(...), file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[-1]
    filename = f"{user_id}_{uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    conn = get_db_connection()
    cursor = conn.cursor()
    updated_time = datetime.now().isoformat(" ", "seconds")
    try:
        cursor.execute(
            "UPDATE users SET face_image_path_front = ?, updated_at = ? WHERE user_id = ?",
            (filepath, updated_time, user_id)
        )
        conn.commit()
        return {"message": "Ảnh khuôn mặt đã được cập nhật."}
    finally:
        conn.close()

@router.get("/info/face_image")
def get_face_image(user_id: str = Query(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT face_image_path_front FROM users WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row["face_image_path_front"] or not os.path.exists(row["face_image_path_front"]):
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh khuôn mặt.")

    return FileResponse(row["face_image_path_front"])

@router.post("/info/update_phone")
def update_phone(user_id: str = Body(...), phone_number: str = Body(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    updated_time = datetime.now().isoformat(" ", "seconds")
    try:
        cursor.execute(
            "UPDATE users SET phone_number = ?, updated_at = ? WHERE user_id = ?",
            (phone_number, updated_time, user_id)
        )
        conn.commit()
        return {"message": "Cập nhật số điện thoại thành công."}
    finally:
        conn.close()

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

@router.get("/get_attendance_history")
def get_attendance_history(user_id: str, class_id: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        print("user_id:", user_id, "class_id:", class_id)
        query = """
            SELECT s.class_id, c.class_name, s.start_time, s.end_time, a.status
            FROM attendance a
            JOIN sessions s ON a.session_id = s.id
            JOIN classes c ON s.class_id = c.class_id
            WHERE a.user_id = ?
        """
        params = [user_id]

        if class_id:
            query += " AND s.class_id = ?"
            params.append(class_id)

        query += " ORDER BY s.start_time DESC"

        print("Running query:", query)
        print("With params:", params)

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()

        history = []
        for row in rows:
            print("row:", row)
            start_time = row[2]
            end_time = row[3]
            date_only = start_time.split(" ")[0]
            time_range = f"{start_time.split(' ')[1]} - {end_time.split(' ')[1]}"

            history.append({
                "class_id": row[0],
                "class_name": row[1],
                "date": date_only,
                "time_range": time_range,
                "status": row[4]
            })

        return {"success": True, "data": history}
    except Exception as e:
        print("❌ ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/enroll_class")
def enroll_class(req: EnrollRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM classes WHERE class_id = ? AND class_key = ?", (req.class_id, req.class_key))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="❌ Mã lớp hoặc key không chính xác.")

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
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()

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
