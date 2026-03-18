import os
import re

src_dir = r"C:\Users\Nevin\Documents\EduPredict\src"
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.js', '.jsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Use import.meta.env.VITE_API_BASE_URL to replace hardcoded localhost:5000
            new_content = re.sub(
                r'http://localhost:5000/api', 
                r'${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}', 
                content
            )
            new_content = re.sub(
                r'http://localhost:5000', 
                r'${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}', 
                new_content
            )
            
            # Fix double quotes inside template literals where replacement happened
            # i.e. "`${import.meta.env.VITE_API_BASE_URL || "..."}`" -> `${...}`
            new_content = re.sub(
                r'\"(\$\{import\.meta\.env\.VITE_API_BASE_URL \|\| \\\"http://localhost:5000(.*?)\\\"\})([^\"]*)\"', 
                r'`\1\3`', 
                new_content
            )
            # Fix single quotes
            new_content = re.sub(
                r'\'(\$\{import\.meta\.env\.VITE_API_BASE_URL \|\| \"http://localhost:5000(.*?)\"\})([^\']*)\'', 
                r'`\1\3`', 
                new_content
            )
            
            if content != new_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Fixed {filepath}")
