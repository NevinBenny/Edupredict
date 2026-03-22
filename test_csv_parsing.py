import io
import csv

def get_val(row_dict, *keys):
    """Robust helper to find column values (BOM-safe, case-insensitive, trimmed)"""
    for k, v in row_dict.items():
        if k is None: continue
        ck = str(k).lower().strip().replace('\ufeff', '')
        if ck in keys:
            return str(v).strip() if v is not None else ""
    return ""

def test_parsing():
    # Test cases: (CSV Content, Expected Results)
    test_cases = [
        (
            "name,email,department,designation\nJohn Doe,john@example.com,CS,Professor",
            [{"name": "John Doe", "email": "john@example.com", "dept": "CS", "designation": "Professor"}]
        ),
        (
            "Name,Email,Department,Designation\nJane Doe,jane@example.com,IT,Lecturer",
            [{"name": "Jane Doe", "email": "jane@example.com", "dept": "IT", "designation": "Lecturer"}]
        ),
        (
            "\ufeffname,email,department,designation\nBOM User,bom@example.com,CS,Professor",
            [{"name": "BOM User", "email": "bom@example.com", "dept": "CS", "designation": "Professor"}]
        ),
        (
            " name , email , dept , role \nSpaced User,spaced@example.com,ME,HOD",
            [{"name": "Spaced User", "email": "spaced@example.com", "dept": "ME", "designation": "HOD"}]
        )
    ]

    for i, (content, expected) in enumerate(test_cases):
        print(f"Test Case {i+1}:")
        stream = io.StringIO(content.replace('\ufeff', '')) # Simulating sig processing or get_val handling
        # Actually sig processing is done at decode level. get_val handles it at key level.
        
        # Test get_val directly with BOM in key
        row_with_bom = {"\ufeffname": "BOM User", "email": "bom@example.com"}
        extracted_name = get_val(row_with_bom, "name")
        print(f"  BOM Key Handling: {'SUCCESS' if extracted_name == 'BOM User' else 'FAILED'}")

        # Test with DictReader
        stream = io.StringIO(content)
        reader = csv.DictReader(stream)
        rows = list(reader)
        for j, row in enumerate(rows):
            name = get_val(row, "name", "full name")
            email = get_val(row, "email")
            dept = get_val(row, "department", "dept")
            designation = get_val(row, "designation", "role")
            
            print(f"  Row {j+1}: Name='{name}', Email='{email}', Dept='{dept}', Designation='{designation}'")
            
            exp = expected[j]
            if name == exp["name"] and email == exp["email"] and dept == exp["dept"] and designation == exp["designation"]:
                print(f"  Result: SUCCESS")
            else:
                print(f"  Result: FAILED (Expected {exp})")

if __name__ == "__main__":
    test_parsing()
