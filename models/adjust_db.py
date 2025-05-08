import os
import sqlite3
import json
import faiss
import numpy as np

# ======= CẤU HÌNH =======
USER_ID = "s1"
DB_PATH = "data/attendance.db"
FACE_DATA_DIR = "data/face_data"
FACE_IMAGE_DIR = "face_images"
INDEX_PATH = os.path.join(FACE_DATA_DIR, "face_index.faiss")
ID_MAP_PATH = os.path.join(FACE_DATA_DIR, "id_map.json")

# ======= 1. XÓA DỮ LIỆU TRONG DATABASE =======
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("DELETE FROM attendance WHERE user_id = ?", (USER_ID,))
cursor.execute("DELETE FROM enrollments WHERE user_id = ?", (USER_ID,))
cursor.execute("SELECT face_image_path_front, face_image_path_left, face_image_path_right FROM users WHERE user_id = ?", (USER_ID,))
rows = cursor.fetchall()
cursor.execute("DELETE FROM users WHERE user_id = ?", (USER_ID,))
conn.commit()
conn.close()

# ======= 2. XÓA FILE ẢNH KHUÔN MẶT =======
for row in rows:
    for path in row:
        if path and os.path.exists(path):
            os.remove(path)
            print(f"🗑️ Đã xoá ảnh: {path}")

# ======= 3. XÓA VECTOR KHỎI FAISS INDEX =======
if os.path.exists(INDEX_PATH) and os.path.exists(ID_MAP_PATH):
    index = faiss.read_index(INDEX_PATH)
    with open(ID_MAP_PATH, "r") as f:
        id_map = json.load(f)

    # Tìm ID tương ứng với USER_ID
    reverse_map = {v: int(k) for k, v in id_map.items()}
    if USER_ID in reverse_map:
        idx = reverse_map[USER_ID]
        index.remove_ids(np.array([idx], dtype=np.int64))
        del id_map[str(idx)]
        print(f"✅ Đã xoá vector của {USER_ID} khỏi FAISS")

        # Ghi lại
        faiss.write_index(index, INDEX_PATH)
        with open(ID_MAP_PATH, "w") as f:
            json.dump(id_map, f, indent=2)
    else:
        print("⚠ Không tìm thấy FAISS ID tương ứng với user này.")
else:
    print("⚠ FAISS index hoặc id_map không tồn tại.")
