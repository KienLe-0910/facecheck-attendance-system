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
from api.faiss_engine import init_index, add_embedding, save_index

router = APIRouter()

FACE_DIR = "face_images"
FRONT_DIR = os.path.join(FACE_DIR, "front")
LEFT_DIR = os.path.join(FACE_DIR, "left")
RIGHT_DIR = os.path.join(FACE_DIR, "right")

os.makedirs(FRONT_DIR, exist_ok=True)
os.makedirs(LEFT_DIR, exist_ok=True)
os.makedirs(RIGHT_DIR, exist_ok=True)

def get_current_vietnam_time():
    tz = pytz.timezone("Asia/Ho_Chi_Minh")
    return datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

class MotionRegisterRequest(BaseModel):
    user_id: str
    name: str
    password: str
    phone_number: str
    email: str
    role: str = "student"
    image_front: str
    image_left: str
    image_right: str

@router.post("/register")
def register_motion(request: MotionRegisterRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        hashed_password = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        now = get_current_vietnam_time()

        init_index()  # ✅ Load hoặc tạo FAISS index

        def save_and_embed(image_data: str, folder: str, suffix: str):
            img_bytes = base64.b64decode(image_data.split(",")[1])
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            filename = f"{request.user_id}_{suffix}_{now.replace(':', '').replace(' ', '_')}.jpg"
            filepath = os.path.join(folder, filename)
            cv2.imwrite(filepath, rgb)

            embedding = DeepFace.represent(
                img_path=filepath,
                model_name="ArcFace",
                enforce_detection=False
            )

            if not embedding or 'embedding' not in embedding[0]:
                raise HTTPException(status_code=400, detail=f"❌ Không phát hiện khuôn mặt trong ảnh {suffix}. Vui lòng chụp lại.")

            vec = np.array(embedding[0]['embedding'], dtype=np.float32)
            vec_str = base64.b64encode(vec.tobytes()).decode("utf-8")
            return vec_str, vec, filepath

        # Lưu và tính embedding từng ảnh
        embed_front, vec_front, path_front = save_and_embed(request.image_front, FRONT_DIR, "front")
        embed_left, vec_left, path_left = save_and_embed(request.image_left, LEFT_DIR, "left")
        embed_right, vec_right, path_right = save_and_embed(request.image_right, RIGHT_DIR, "right")

        # ✅ Gọi đúng - KHÔNG nối thủ công __angle
        add_embedding(request.user_id, vec_front, "front")
        add_embedding(request.user_id, vec_left, "left")
        add_embedding(request.user_id, vec_right, "right")
        save_index()

        # Ghi vào DB
        cursor.execute("""
            INSERT INTO users (
                user_id, name, password, role, phone_number, email,
                embedding_front, embedding_left, embedding_right,
                face_image_path_front, face_image_path_left, face_image_path_right,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            request.user_id,
            request.name,
            hashed_password,
            request.role,
            request.phone_number,
            request.email,
            embed_front,
            embed_left,
            embed_right,
            path_front,
            path_left,
            path_right,
            now,
            now
        ))
        conn.commit()
        return {"success": True, "message": "✅ Đăng ký thành công"}

    except Exception as e:
        print("🛑 Lỗi đăng ký motion:", e)
        conn.rollback()
        return {"success": False, "message": f"Lỗi đăng ký: {e}"}

    finally:
        conn.close()
