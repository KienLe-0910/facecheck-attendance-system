import os
import cv2
import face_recognition
import pickle
import base64
import sqlite3
import numpy as np
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify

# Khởi tạo Flask
app = Flask(__name__)
app.secret_key = "secret123"  # Để sử dụng flash messages

# Đường dẫn database
DB_PATH = "project-03/data/attendance.db"

# Tạo thư mục nếu chưa có
if not os.path.exists("project-03/data"):
    os.makedirs("project-03/data")

# Kết nối database
def connect_db():
    return sqlite3.connect(DB_PATH)

# Tạo bảng trong database nếu chưa có
def create_tables():
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS face_encodings (
        student_id TEXT PRIMARY KEY,
        encoding BLOB NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_log (
        student_id TEXT,
        name TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
    )
    """)

    conn.commit()
    conn.close()

# ------------------- [1] ĐĂNG KÝ SINH VIÊN -------------------
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        student_id = request.form['student_id']
        student_name = request.form['student_name']
        image_data = request.form['image_data']

        if not image_data:
            return "⚠ Vui lòng chụp ảnh khuôn mặt!"

        # Giải mã ảnh từ base64
        image_data = image_data.replace("data:image/jpeg;base64,", "")
        image_data = base64.b64decode(image_data)
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Nhận diện khuôn mặt
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_img)
        encodings = face_recognition.face_encodings(rgb_img, face_locations)

        if len(encodings) == 0:
            return "⚠ Không tìm thấy khuôn mặt! Vui lòng thử lại."

        face_encoding = encodings[0]
        encoding_blob = pickle.dumps(face_encoding)

        # Lưu vào database
        conn = connect_db()
        cursor = conn.cursor()

        try:
            cursor.execute("INSERT INTO students (id, name) VALUES (?, ?)", (student_id, student_name))
            cursor.execute("INSERT INTO face_encodings (student_id, encoding) VALUES (?, ?)", (student_id, encoding_blob))
            conn.commit()
        except sqlite3.IntegrityError:
            return "⚠ Mã sinh viên đã tồn tại!"

        conn.close()
        return redirect(url_for('index'))

    return render_template('register.html')

# ------------------- [2] ĐIỂM DANH -------------------
@app.route('/attendance', methods=['GET', 'POST'])
def attendance():
    if request.method == 'POST':
        image_data = request.form['image_data']
        image_data = image_data.replace("data:image/jpeg;base64,", "")
        image_data = base64.b64decode(image_data)

        # Lưu ảnh để debug (tùy chọn)
        with open("captured_face.jpg", "wb") as f:
            f.write(image_data)

        # Chuyển ảnh thành numpy array để xử lý bằng OpenCV
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Nhận diện khuôn mặt bằng OpenCV
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        if len(faces) == 0:
            return jsonify({"status": "error", "message": "Không phát hiện khuôn mặt!"})

        return jsonify({"status": "success", "message": "Khuôn mặt hợp lệ!"})

    return render_template('attendance.html')

# ------------------- [3] XEM DANH SÁCH ĐIỂM DANH -------------------
@app.route('/attendance_list')
def attendance_list():
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("SELECT student_id, name, timestamp FROM attendance_log ORDER BY timestamp DESC")
    data = cursor.fetchall()

    conn.close()
    return render_template('attendance_list.html', attendance_data=data)

# ------------------- TRANG CHỦ -------------------
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == "__main__":
    create_tables()
    app.run(debug=True)