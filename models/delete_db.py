# import sqlite3

# # Kết nối đến database
# conn = sqlite3.connect('data/attendance.db')  # thay tên nếu khác
# cursor = conn.cursor()

# cursor.execute("DROP TABLE IF EXISTS users")


import sqlite3

conn = sqlite3.connect("data/attendance.db")
cursor = conn.cursor()

tables = ["users", "classes", "enrollments", "sessions", "attendance"]

for table in tables:
    cursor.execute(f"DELETE FROM {table};")
    cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}';")

conn.commit()
conn.close()

print("✅ Đã xoá toàn bộ dữ liệu và reset lại ID.")