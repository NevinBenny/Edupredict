import os
import re

def fix_api_urls(directory):
    clean_string = "${import.meta.env.VITE_API_BASE_URL || \"http://localhost:5000\"}/api"
    
    files_fixed = 0

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.js', '.jsx')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                original_content = content

                # Fix 1: The massively nested ones
                content = re.sub(
                    r'\$\{import\.meta\.env\.VITE_API_BASE_URL \|\| "\$\{import\.meta\.env\.VITE_API_BASE_URL \|\| "\$\{import\.meta\.env\.VITE_API_BASE_URL \|\| "http://localhost:5000"\}/api"\}"\}',
                    clean_string,
                    content
                )
                
                # Fix 2: The doubly nested ones
                content = re.sub(
                    r'\$\{import\.meta\.env\.VITE_API_BASE_URL \|\| "\$\{import\.meta\.env\.VITE_API_BASE_URL \|\| "http://localhost:5000"\}/api"\}',
                    clean_string,
                    content
                )
                
                # Fix 3: api.js specific single quotes nesting
                content = content.replace(
                    "import.meta.env.VITE_API_BASE_URL || '${import.meta.env.VITE_API_BASE_URL || \"${import.meta.env.VITE_API_BASE_URL || \"http://localhost:5000\"}/api\"}'",
                    "import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'"
                )

                if content != original_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Fixed {filepath}")
                    files_fixed += 1
    
    print(f"Total files fixed: {files_fixed}")

if __name__ == "__main__":
    src_dir = os.path.join(os.path.dirname(__file__), 'src')
    fix_api_urls(src_dir)
