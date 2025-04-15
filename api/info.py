from fastapi import APIRouter, HTTPException, UploadFile, File, Body, Query
from fastapi.responses import FileResponse
from models.db import get_db_connection
import os
import sqlite3
from uuid import uuid4
from datetime import datetime

router = APIRouter()
UPLOAD_FOLDER = "face_images"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 📌 API: Lấy thông tin người dùng
@router.get("/info")
def get_info(user_id: str = Query(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT user_id, name, role, phone_number, 
                   face_image_path_front, face_image_path_left, face_image_path_right,
                   updated_at 
            FROM users WHERE user_id = ?
        """, (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        data = {key: row[key] for key in row.keys()}
        # Gán mặt định là ảnh phía trước
        data["face_image_path"] = row["face_image_path_front"]
        return {"success": True, "data": data}
    finally:
        conn.close()


# 📌 API: Cập nhật tên hiển thị
@router.post("/info/update_name")
def update_name(
    user_id: str = Body(...),
    new_name: str = Body(...),
):
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


# 📌 API: Đổi mật khẩu
@router.post("/info/change_password")
def change_password(
    user_id: str = Body(...),
    old_password: str = Body(...),
    new_password: str = Body(...),
):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT password FROM users WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or row[0] != old_password:
            raise HTTPException(status_code=400, detail="Mật khẩu cũ không đúng.")

        updated_time = datetime.now().isoformat(" ", "seconds")
        cursor.execute(
            "UPDATE users SET password = ?, updated_at = ? WHERE user_id = ?",
            (new_password, updated_time, user_id)
        )
        conn.commit()
        return {"message": "Mật khẩu đã được thay đổi."}
    finally:
        conn.close()


# 📌 API: Cập nhật ảnh khuôn mặt
@router.post("/info/update_face")
def update_face(
    user_id: str = Query(...),
    file: UploadFile = File(...)
):
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


# 📌 API: Trả về ảnh khuôn mặt
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

# 📌 API: Cập nhật số điện thoại
@router.post("/info/update_phone")
def update_phone(
    user_id: str = Body(...),
    phone_number: str = Body(...),
):
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
