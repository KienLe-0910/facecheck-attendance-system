import cv2
import face_recognition
import sqlite3
import pickle
import numpy as np
from datetime import datetime

DB_PATH = "project-03/data/attendance.db"

def connect_db():
    return sqlite3.connect(DB_PATH)

# Mở webcam
cap = cv2.VideoCapture(0)
print("📸 Nhìn vào camera để điểm danh...")

face_matched = False
matched_student = None

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Lỗi khi mở webcam!")
        break

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_frame)
    encodings = face_recognition.face_encodings(rgb_frame, face_locations)

    if len(encodings) > 0:
        encoding_to_check = encodings[0]

        # Kiểm tra với database
        conn = connect_db()
        cursor = conn.cursor()

        cursor.execute("SELECT student_id, encoding FROM face_encodings")
        data = cursor.fetchall()

        for student_id, encoding_blob in data:
            stored_encoding = pickle.loads(encoding_blob)
            results = face_recognition.compare_faces([stored_encoding], encoding_to_check, tolerance=0.5)

            if results[0]:  # Nếu trùng khớp
                cursor.execute("SELECT name FROM students WHERE id=?", (student_id,))
                student_name = cursor.fetchone()[0]
                matched_student = (student_id, student_name)
                face_matched = True
                break

        conn.close()

    if face_matched:
        cv2.putText(frame, f"✅ {matched_student[1]} đã điểm danh!", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        print(f"🎉 Điểm danh thành công: {matched_student[1]}")

        # Lưu thời gian điểm danh vào database
        conn = connect_db()
        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO attendance_log (student_id, name, timestamp)
        VALUES (?, ?, ?)
        """, (matched_student[0], matched_student[1], datetime.now()))

        conn.commit()
        conn.close()

        cv2.waitKey(3000)  # Đợi 3 giây rồi thoát
        break

    cv2.imshow("Điểm danh sinh viên", frame)

    key = cv2.waitKey(1) & 0xFF
    if key == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()