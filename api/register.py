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

# -------- API duy nhất: /register --------
class RegisterRequest(BaseModel):
    user_id: str
    name: str
    password: str
    phone_number: str
    role: str = "student"
    image_data: str  # base64 của ảnh chụp khuôn mặt

@router.post("/register")
def register(request: RegisterRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 🔒 Mã hóa mật khẩu
        hashed_password = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        now = get_current_vietnam_time()

        # ✅ Bước 1: Xử lý ảnh và lấy embedding
        img_data = base64.b64decode(request.image_data.split(",")[1])
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        temp_path = f"face_images/{request.user_id}_{now.replace(':', '').replace(' ', '_')}.jpg"
        cv2.imwrite(temp_path, rgb)

        embedding = DeepFace.represent(
            img_path=temp_path,
            model_name="ArcFace",
            enforce_detection=True
        )
        embedding_vector = np.array(embedding[0]['embedding'], dtype=np.float32)
        embedding_str = base64.b64encode(embedding_vector.tobytes()).decode("utf-8")

        # ✅ Bước 2: Lưu tất cả vào database
        cursor.execute("""
            INSERT INTO users (user_id, name, password, role, phone_number, embedding, face_image_path, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request.user_id,
            request.name,
            hashed_password,
            request.role,
            request.phone_number,
            embedding_str,
            temp_path,
            now,
            now
        ))
        conn.commit()

        return {"success": True, "message": "✅ Đăng ký thành công!"}

    except Exception as e:
        # Nếu lỗi → không lưu vào DB
        print("🛑 Lỗi đăng ký:", e)
        conn.rollback()
        return {"success": False, "message": f"Lỗi đăng ký: {e}"}

    finally:
        conn.close()
