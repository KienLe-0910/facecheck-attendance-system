from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.db import get_db_connection
from deepface import DeepFace
import base64
import cv2
import numpy as np
import datetime
import os
import pytz

router = APIRouter()

class AttendanceRequest(BaseModel):
    user_id: str
    session_id: int
    image_data: str  # Base64 ảnh khuôn mặt

def extract_embedding_from_base64(image_base64):
    img_data = base64.b64decode(image_base64.split(",")[1])
    np_arr = np.frombuffer(img_data, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    temp_image_path = "temp_attendance.jpg"
    cv2.imwrite(temp_image_path, rgb_frame)

    try:
        embedding = DeepFace.represent(img_path=temp_image_path, model_name="Facenet")[0]["embedding"]
        return np.array(embedding, dtype=np.float32)
    finally:
        os.remove(temp_image_path)

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

@router.post("/attendance")
def mark_attendance(request: AttendanceRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Lấy embedding đã lưu của user
        cursor.execute("SELECT embedding FROM users WHERE user_id = ?", (request.user_id,))
        row = cursor.fetchone()
        if not row or not row["embedding"]:
            raise HTTPException(status_code=400, detail="❌ Không tìm thấy embedding của người dùng!")

        stored_embedding = np.frombuffer(base64.b64decode(row["embedding"]), dtype=np.float32)
        current_embedding = extract_embedding_from_base64(request.image_data)

        similarity = cosine_similarity(current_embedding, stored_embedding)
        if similarity < 0.9:
            return {"success": False, "message": "❌ Khuôn mặt không khớp!"}

        # Kiểm tra phiên điểm danh
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (request.session_id,))
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="❌ Phiên điểm danh không tồn tại!")

        start_time = datetime.datetime.strptime(session["start_time"], "%Y-%m-%d %H:%M:%S")
        end_time = datetime.datetime.strptime(session["end_time"], "%Y-%m-%d %H:%M:%S")
        now = datetime.datetime.now(pytz.timezone("Asia/Ho_Chi_Minh"))

        if not (start_time <= now <= end_time):
            return {"success": False, "message": "⚠ Ngoài thời gian điểm danh!"}

        # Kiểm tra đã điểm danh chưa
        cursor.execute("""
            SELECT * FROM attendance
            WHERE user_id = ? AND session_id = ?
        """, (request.user_id, request.session_id))
        if cursor.fetchone():
            return {"success": False, "message": "⚠ Bạn đã điểm danh rồi!"}

        status = "on-time" if now <= start_time + datetime.timedelta(minutes=10) else "late"

        cursor.execute("""
            INSERT INTO attendance (user_id, session_id, status, created_at)
            VALUES (?, ?, ?, ?)
        """, (request.user_id, request.session_id, status, now.strftime("%Y-%m-%d %H:%M:%S")))

        conn.commit()
        return {"success": True, "message": f"✅ Điểm danh thành công! Trạng thái: {status}"}

    except HTTPException as he:
        raise he
    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()
