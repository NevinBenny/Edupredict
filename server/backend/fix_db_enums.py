from db_connect import get_connection

def fix_interventions_table():
    print("Connecting to database...")
    conn = get_connection()
    try:
        cur = conn.cursor()
        print("Updating 'status' column ENUM in the 'interventions' table to include 'Submitted'...")
        
        # Modify the column to accept 'Submitted'
        alter_query = """
        ALTER TABLE interventions 
        MODIFY COLUMN status ENUM('Pending', 'In Progress', 'Submitted', 'Completed') DEFAULT 'Pending'
        """
        cur.execute(alter_query)
        conn.commit()
        
        print("Success! The table has been updated. Students can now submit their tasks.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_interventions_table()
