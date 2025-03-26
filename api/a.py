from fastapi import APIRouter, UploadFile, File, HTTPException
import numpy as np
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
import base64
from deepface import DeepFace
from models.db import get_db_connection


router = APIRouter()

def extract_embedding(image_path):
    try:
        embedding = DeepFace.represent(img_path=image_path, model_name="Facenet")
        return np.array(embedding[0]["embedding"], dtype=np.float32)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi nhận diện khuôn mặt: {str(e)}")

@router.post("/register/")
def register(student_id: str, name: str, file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ ảnh JPG hoặc PNG")

    image_path = f"temp_{student_id}.jpg"
    with open(image_path, "wb") as img:
        img.write(file.file.read())

    embedding = extract_embedding(image_path)
    os.remove(image_path)

    # Chuyển mảng NumPy thành chuỗi Base64 để lưu vào DB
    embedding_str = base64.b64encode(embedding.tobytes()).decode("utf-8")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO students (student_id, name, embedding) VALUES (?, ?, ?)",
                       (student_id, name, embedding_str))
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi lưu vào DB: {str(e)}")
    finally:
        conn.close()

    return {"message": "Đăng ký thành công", "student_id": student_id}
