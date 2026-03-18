import os
import glob
import re

src_dir = r"c:/Users/Nevin/Documents/EduPredict/src"

js_jsx_files = glob.glob(os.path.join(src_dir, "**/*.js"), recursive=True) + \
               glob.glob(os.path.join(src_dir, "**/*.jsx"), recursive=True)

# Replace 'http://localhost:5000/api' with `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}`
# Only when inside quotes or backticks.

for filepath in js_jsx_files:
    if "api.js" in filepath:
        continue # Already handled manually
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Pattern to match 'http://localhost:5000/api...'
        if "http://localhost:5000/api" in content:
            # We will just replace 'http://localhost:5000/api' with `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}`
            # BUT we need to change quotes to backticks if they were single or double quotes.
            # Example: fetch('http://localhost:5000/api/students') -> fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/students`)
            
            # regex approach to catch the whole string
            new_content = re.sub(
                r'[\'"]http://localhost:5000/api(.*?)[\'"]', 
                r'`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}\1`', 
                content
            )
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

print("Done replacing API urls.")
