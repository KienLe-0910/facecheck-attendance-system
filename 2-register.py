import os
import cv2
import face_recognition
import pickle
import sqlite3
import numpy as np

# Tạo thư mục lưu dữ liệu
DATA_DIR = "project-03/data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

DB_PATH = "project-03/data/attendance.db"

def connect_db():
    return sqlite3.connect(DB_PATH)

# Nhập thông tin sinh viên
student_id = input("🔵 Nhập ID sinh viên: ")
student_name = input("🔵 Nhập tên sinh viên: ")

# Mở webcam
cap = cv2.VideoCapture(0)
print("📸 Nhìn vào camera, hệ thống sẽ tự động nhận diện khuôn mặt...")

face_detected = False
face_encoding = None

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Lỗi khi mở webcam!")
        break

    # Nhận diện khuôn mặt
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_frame)
    encodings = face_recognition.face_encodings(rgb_frame, face_locations)

    if len(encodings) > 0:
        face_encoding = encodings[0]
        face_detected = True
        cv2.putText(frame, "Khuôn mặt đã nhận diện!", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    cv2.imshow("Quét khuôn mặt để đăng ký", frame)

    # Nếu nhận diện khuôn mặt, chờ 3 giây rồi tự động đăng ký
    if face_detected:
        print("✅ Khuôn mặt nhận diện! Đang lưu thông tin...")
        cv2.waitKey(3000)
        break

    key = cv2.waitKey(1) & 0xFF
    if key == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

if face_encoding is not None:
    encoding_blob = pickle.dumps(face_encoding)

    # Lưu dữ liệu vào database
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("INSERT INTO students (id, name) VALUES (?, ?)", (student_id, student_name))
    cursor.execute("INSERT INTO face_encodings (student_id, encoding) VALUES (?, ?)", (student_id, encoding_blob))

    conn.commit()
    conn.close()

    print(f"🎉 Sinh viên {student_name} (ID: {student_id}) đã đăng ký thành công!")
else:
    print("⚠ Không tìm thấy khuôn mặt! Vui lòng thử lại.")