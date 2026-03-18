from db_connect import get_connection
conn=get_connection()
cur=conn.cursor(dictionary=True)
cur.execute('SELECT * FROM students WHERE name LIKE \'%Aleena%\'')
student = cur.fetchone()
print('Student:', student)
if student:
    cur.execute('SELECT * FROM interventions WHERE student_id=%s', (student['student_id'],))
    print('Interventions:', cur.fetchall())
cur.close()
conn.close()
