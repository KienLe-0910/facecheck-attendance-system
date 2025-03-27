from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.db import get_db_connection
from datetime import datetime
import pytz

router = APIRouter()

class EnrollRequest(BaseModel):
    user_id: str
    class_id: str

@router.post("/enroll_class")
def enroll_class(req: EnrollRequest):
    """
    Người dùng đăng ký vào lớp học phần.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print(f"[INFO] Nhận yêu cầu đăng ký: user_id={req.user_id}, class_id={req.class_id}")

        # Kiểm tra lớp học tồn tại
        cursor.execute("SELECT * FROM classes WHERE class_id = ?", (req.class_id,))
        if not cursor.fetchone():
            print("[WARN] Lớp học không tồn tại.")
            raise HTTPException(status_code=404, detail="❌ Lớp học phần không tồn tại!")

        # Kiểm tra người dùng đã đăng ký chưa
        cursor.execute("SELECT * FROM enrollments WHERE user_id = ? AND class_id = ?", 
                       (req.user_id, req.class_id))
        if cursor.fetchone():
            print("[WARN] Người dùng đã đăng ký lớp này.")
            raise HTTPException(status_code=400, detail="⚠️ Bạn đã đăng ký lớp này rồi!")

        # Ghi lại thời gian theo múi giờ Việt Nam
        vn_time = datetime.now(pytz.timezone("Asia/Ho_Chi_Minh")).strftime("%Y-%m-%d %H:%M:%S")
        
        # Thêm vào bảng trung gian
        cursor.execute(
            "INSERT INTO enrollments (user_id, class_id, created_at) VALUES (?, ?, ?)", 
            (req.user_id, req.class_id, vn_time)
        )
        conn.commit()

        print("[INFO] Đăng ký thành công.")
        return {"success": True, "message": "✅ Đăng ký lớp học phần thành công!"}

    except HTTPException as he:
        raise he

    except Exception as e:
        print(f"[ERROR] Lỗi khi đăng ký: {e}")
        return {"success": False, "message": f"Lỗi hệ thống: {str(e)}"}

    finally:
        conn.close()
