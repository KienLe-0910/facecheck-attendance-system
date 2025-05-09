from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel
from models.db import get_db_connection
from deepface import DeepFace
from api.faiss_engine import init_index, search_by_user_all_angles
import base64
import cv2
import numpy as np
import datetime
import os
import pytz

router = APIRouter()

MODEL_NAME = "ArcFace"
COSINE_THRESHOLD = 0.6  # ngưỡng cosine similarity

init_index()  # Load FAISS index khi khởi động

def extract_embedding_from_base64(image_base64):
    try:
        img_data = base64.b64decode(image_base64.split(",")[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        temp_image_path = "temp_attendance.jpg"
        cv2.imwrite(temp_image_path, rgb_frame)

        embedding = DeepFace.represent(
            img_path=temp_image_path,
            model_name=MODEL_NAME,
            enforce_detection=False
        )
        os.remove(temp_image_path)

        if not embedding or 'embedding' not in embedding[0]:
            return None
        return np.array(embedding[0]["embedding"], dtype=np.float32)
    except Exception as e:
        print("❌ Lỗi khi trích xuất embedding:", e)
        return None

@router.post("/attendance")
def mark_attendance(
    user_id: str = Form(...),
    session_id: int = Form(...),
    image_front: str = Form(...),
    image_left: str = Form(...),
    image_right: str = Form(...)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # === Chuẩn bị các vector từ ảnh ===
        embeddings = {
            "front": extract_embedding_from_base64(image_front),
            "left": extract_embedding_from_base64(image_left),
            "right": extract_embedding_from_base64(image_right)
        }

        if any(v is None for v in embeddings.values()):
            return {"success": False, "message": "❌ Không phát hiện khuôn mặt trong 1 hoặc nhiều ảnh."}

        matched_count = search_by_user_all_angles(user_id, embeddings, threshold=COSINE_THRESHOLD)

        if matched_count < 2:
            return {"success": False, "message": "❌ Khuôn mặt không khớp đủ 2 góc với tài khoản!"}

        # === Kiểm tra phiên hợp lệ ===
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="❌ Phiên điểm danh không tồn tại!")

        vn_tz = pytz.timezone("Asia/Ho_Chi_Minh")
        now = datetime.datetime.now(vn_tz)

        start_time = vn_tz.localize(datetime.datetime.strptime(session["start_time"], "%Y-%m-%d %H:%M:%S"))
        end_time = vn_tz.localize(datetime.datetime.strptime(session["end_time"], "%Y-%m-%d %H:%M:%S"))
        ontime_limit = session["ontime_limit"] if "ontime_limit" in session.keys() else 10

        if not (start_time <= now <= end_time):
            return {"success": False, "message": "⚠ Ngoài thời gian điểm danh!"}

        cursor.execute("""
            SELECT * FROM attendance
            WHERE user_id = ? AND session_id = ?
        """, (user_id, session_id))
        if cursor.fetchone():
            return {"success": False, "message": "⚠ Bạn đã điểm danh rồi!"}

        status = "on-time" if now <= start_time + datetime.timedelta(minutes=ontime_limit) else "late"

        cursor.execute("""
            INSERT INTO attendance (user_id, session_id, status, created_at)
            VALUES (?, ?, ?, ?)
        """, (user_id, session_id, status, now.strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()

        return {"success": True, "message": f"✅ Điểm danh thành công! Trạng thái: {status}"}

    except HTTPException as he:
        raise he
    except Exception as e:
        print("🛑 Lỗi hệ thống:", e)
        return {"success": False, "message": f"Lỗi hệ thống: {e}"}
    finally:
        conn.close()


@router.get("/get_available_sessions")
def get_available_sessions(user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now = datetime.datetime.now(pytz.timezone("Asia/Ho_Chi_Minh")).strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            SELECT s.id AS session_id, s.class_id, c.class_name, s.start_time, s.end_time
            FROM sessions s
            JOIN classes c ON s.class_id = c.class_id
            JOIN enrollments e ON e.class_id = s.class_id
            WHERE e.user_id = ? AND s.start_time <= ? AND s.end_time >= ?
            ORDER BY s.start_time ASC
        """, (user_id, now, now))
        return {"success": True, "data": [dict(row) for row in cursor.fetchall()]}
    except Exception as e:
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}
    finally:
        conn.close()
