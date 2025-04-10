import sqlite3

# Kết nối đến database
conn = sqlite3.connect('data/attendance.db')  # thay tên nếu khác
cursor = conn.cursor()

# cursor.execute("DROP TABLE IF EXISTS users")

#-------------------------------------------------------------------------#

def delete_user(user_id: str):
    try:
        cursor.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
        conn.commit()
        print(f"Người dùng với ID {user_id} đã bị xóa.")
    except Exception as e:
        print(f"Đã xảy ra lỗi: {e}")
    finally:
        conn.close()

# Gọi hàm để xóa người dùng có user_id = 'x'
delete_user('s2')

# tables = ["users", "classes", "enrollments", "sessions", "attendance"]

# for table in tables:
#     cursor.execute(f"DELETE FROM {table};")
#     cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}';")

# conn.commit()
# conn.close()

# print("✅ Đã xoá toàn bộ dữ liệu và reset lại ID.")