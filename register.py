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

# Nhập thông tin sinh viên
student_id = input("Nhập ID sinh viên: ")
student_name = input("Nhập tên sinh viên: ")

# Kiểm tra xem ID đã tồn tại chưa
cursor.execute("SELECT * FROM students WHERE id=?", (student_id,))
if cursor.fetchone():
    print(f"⚠️ Sinh viên với ID {student_id} đã tồn tại! Không thể đăng ký lại.")
    conn.close()
else:
    # Mở webcam
    cap = cv2.VideoCapture(0)
    print("📸 Vui lòng nhìn thẳng vào camera...")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Lỗi khi mở webcam!")
            break

        cv2.imshow("Quét khuôn mặt", frame)
        key = cv2.waitKey(1) & 0xFF

        # Nhấn 's' để chụp ảnh và lưu
        if key == ord("s"):
            image_path = "project-03/data/temp.jpg"
            cv2.imwrite(image_path, frame)
            print("✅ Ảnh đã chụp!")
            break

    cap.release()
    cv2.destroyAllWindows()

    # Load ảnh và mã hóa khuôn mặt
    image = face_recognition.load_image_file(image_path)
    face_encodings = face_recognition.face_encodings(image)

    if len(face_encodings) > 0:
        encoding = face_encodings[0]
        encoding_blob = pickle.dumps(encoding)  # Chuyển mã hóa sang dạng blob

        # Lưu thông tin vào database
        cursor.execute("INSERT INTO students (id, name) VALUES (?, ?)", (student_id, student_name))
        cursor.execute("INSERT INTO face_encodings (student_id, encoding) VALUES (?, ?)", (student_id, encoding_blob))

        conn.commit()
        print(f"✅ Sinh viên {student_name} (ID: {student_id}) đã đăng ký thành công!")

    else:
        print("❌ Không tìm thấy khuôn mặt trong ảnh! Vui lòng thử lại.")

conn.close()