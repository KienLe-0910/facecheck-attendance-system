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
    class_id: str
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
        # Lấy embedding đã lưu
        cursor.execute("SELECT embedding FROM users WHERE user_id = ?", (request.user_id,))
        row = cursor.fetchone()
        if not row or not row["embedding"]:
            raise HTTPException(status_code=400, detail="❌ Không tìm thấy người dùng hoặc chưa đăng ký khuôn mặt!")

        stored_embedding = np.frombuffer(base64.b64decode(row["embedding"]), dtype=np.float32)

        # Trích xuất embedding từ ảnh hiện tại
        current_embedding = extract_embedding_from_base64(request.image_data)

        similarity = cosine_similarity(current_embedding, stored_embedding)

        if similarity > 0.9:
            # Kiểm tra thời gian điểm danh
            cursor.execute("SELECT start_time FROM classes WHERE class_id = ?", (request.class_id,))
            class_info = cursor.fetchone()
            if not class_info:
                raise HTTPException(status_code=400, detail="❌ Không tìm thấy lớp học phần!")

            start_time_str = class_info["start_time"]
            if not start_time_str:
                raise HTTPException(status_code=400, detail="⚠️ Lớp học phần chưa được cấu hình thời gian điểm danh!")

            class_start_time = datetime.datetime.strptime(start_time_str, "%Y-%m-%d %H:%M:%S")

            # Lấy giờ hiện tại theo giờ Việt Nam
            vn_now = datetime.datetime.now(pytz.timezone("Asia/Ho_Chi_Minh"))
            status = "Đúng giờ" if vn_now <= class_start_time else "Muộn"

            cursor.execute(
                "INSERT INTO attendance (user_id, class_id, timestamp, status) VALUES (?, ?, ?, ?)",
                (request.user_id, request.class_id, vn_now.strftime("%Y-%m-%d %H:%M:%S"), status)
            )
            conn.commit()

            return {"success": True, "message": f"✅ Điểm danh thành công! Trạng thái: {status}"}
        else:
            return {"success": False, "message": "❌ Khuôn mặt không khớp!"}

    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}

    finally:
        conn.close()
