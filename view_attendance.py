import sqlite3
from tabulate import tabulate

DB_PATH = "project-03/data/attendance.db"

def view_attendance():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT student_id, name, timestamp FROM attendance_log ORDER BY timestamp DESC")
    data = cursor.fetchall()

    conn.close()

    if data:
        print(tabulate(data, headers=["ID Sinh viên", "Tên", "Thời gian điểm danh"], tablefmt="grid"))
    else:
        print("📌 Chưa có sinh viên nào điểm danh!")

if __name__ == "__main__":
    view_attendance()