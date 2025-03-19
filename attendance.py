import os
import cv2
import face_recognition
import sqlite3
import pickle
import numpy as np

# Đường dẫn database
db_path = "project-03/data/attendance.db"

# Kết nối database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Mở webcam
cap = cv2.VideoCapture(0)
print("📸 Vui lòng nhìn thẳng vào camera để điểm danh...")

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Lỗi khi mở webcam!")
        break

    cv2.imshow("Quét khuôn mặt để điểm danh", frame)
    key = cv2.waitKey(1) & 0xFF

    # Nhấn 's' để chụp ảnh và nhận diện
    if key == ord("s"):
        image_path = "project-03/data/temp_attendance.jpg"
        cv2.imwrite(image_path, frame)
        print("✅ Ảnh đã chụp! Đang xử lý nhận diện...")
        break

cap.release()
cv2.destroyAllWindows()

# Load ảnh và mã hóa khuôn mặt
image = face_recognition.load_image_file(image_path)
face_encodings = face_recognition.face_encodings(image)

if len(face_encodings) > 0:
    encoding_to_check = face_encodings[0]

    # Lấy dữ liệu mã hóa khuôn mặt từ database
    cursor.execute("SELECT student_id, encoding FROM face_encodings")
    data = cursor.fetchall()

    for student_id, encoding_blob in data:
        stored_encoding = pickle.loads(encoding_blob)  # Giải mã dữ liệu từ blob

        # So sánh khuôn mặt
        results = face_recognition.compare_faces([stored_encoding], encoding_to_check, tolerance=0.5)

        if results[0]:  # Nếu trùng khớp
            cursor.execute("SELECT name FROM students WHERE id=?", (student_id,))
            student_name = cursor.fetchone()[0]

            # Lưu vào bảng điểm danh
            cursor.execute("INSERT INTO attendance (student_id, name) VALUES (?, ?)", (student_id, student_name))
            conn.commit()

            print(f"✅ Điểm danh thành công: {student_name} (ID: {student_id})")
            break
    else:
        print("❌ Không tìm thấy sinh viên trong hệ thống!")
else:
    print("❌ Không tìm thấy khuôn mặt trong ảnh!")

conn.close()