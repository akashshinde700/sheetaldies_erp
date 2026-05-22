"""Quick fix: upload updated nginx config + reload nginx on server."""
import paramiko

HOST     = "72.61.248.205"
USER     = "root"
PASSWORD = "Oceanthryve@2025"

LOCAL_NGINX  = r"c:\Users\ACER\Desktop\sheetaldies erp project\nginx-codeprana.conf"
REMOTE_NGINX = "/etc/nginx/sites-available/codeprana.conf"

print("Connecting to server...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
print("Connected.")

sftp = ssh.open_sftp()

# 1. Ensure uploads directories exist
print("\nCreating upload directories...")
_, out, err = ssh.exec_command(
    "mkdir -p /root/sheetaldies/backend/uploads/jobcards "
    "/root/sheetaldies/backend/uploads/items "
    "/root/sheetaldies/backend/uploads/machines "
    "/root/sheetaldies/backend/uploads/parts && echo OK"
)
print(out.read().decode().strip() or err.read().decode().strip())

# 2. Upload nginx config
print("\nUploading nginx config...")
sftp.put(LOCAL_NGINX, REMOTE_NGINX)
print("  Uploaded: " + REMOTE_NGINX)

# 3. Test nginx config
print("\nTesting nginx config...")
_, out, err = ssh.exec_command("nginx -t 2>&1")
result = out.read().decode() + err.read().decode()
print(result.strip())

if "syntax is ok" in result and "test is successful" in result:
    # 4. Reload nginx
    print("\nReloading nginx...")
    _, out, err = ssh.exec_command("systemctl reload nginx 2>&1 && echo 'Nginx reloaded OK'")
    print(out.read().decode().strip() or err.read().decode().strip())
else:
    print("\n[ERROR] nginx config test failed - NOT reloading.")

sftp.close()
ssh.close()
print("\nDone.")
