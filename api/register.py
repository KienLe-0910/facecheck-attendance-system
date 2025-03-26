from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.db import get_db_connection
from deepface import DeepFace
import numpy as np
import base64
import bcrypt
import os
import cv2
from datetime import datetime
import pytz

router = APIRouter()

def get_current_vietnam_time():
    tz = pytz.timezone("Asia/Ho_Chi_Minh")
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

# -------- Bước 1: Lưu thông tin --------
class RegisterInfoRequest(BaseModel):
    student_id: str
    name: str
    password: str
    role: str

@router.post("/register_info")
def register_info(request: RegisterInfoRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        hashed_password = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        now = get_current_vietnam_time()
        cursor.execute("""
            INSERT INTO users (user_id, name, password, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (request.student_id, request.name, hashed_password, request.role, now))
        conn.commit()
        return {"success": True, "message": "✅ Đã lưu thông tin sinh viên!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi lưu thông tin: {e}")
    finally:
        conn.close()

# -------- Bước 2: Lưu embedding khuôn mặt --------
class UploadFaceRequest(BaseModel):
    student_id: str
    image_data: str  # base64 ảnh từ camera

@router.post("/upload_face")
def upload_face(request: UploadFaceRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Giải mã ảnh base64
        img_data = base64.b64decode(request.image_data.split(",")[1])
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Chuyển sang RGB (DeepFace yêu cầu)
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        temp_path = f"temp_face_{request.student_id}.jpg"
        cv2.imwrite(temp_path, rgb)

        # Trích xuất embedding
        embedding = DeepFace.represent(img_path=temp_path, model_name="Facenet")
        embedding_vector = np.array(embedding[0]['embedding'], dtype=np.float32)
        embedding_str = base64.b64encode(embedding_vector.tobytes()).decode("utf-8")

        # Cập nhật vào bảng users
        cursor.execute("""
            UPDATE users SET embedding = ? WHERE user_id = ?
        """, (embedding_str, request.student_id))
        conn.commit()
        os.remove(temp_path)

        return {"success": True, "message": "✅ Đã lưu khuôn mặt thành công!"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi xử lý ảnh: {e}")
    finally:
        conn.close()