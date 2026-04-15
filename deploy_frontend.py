#!/usr/bin/env python3
"""Deploy frontend/dist to VPS via SFTP."""
import os, paramiko, sys
from pathlib import Path

HOST = "72.61.248.205"
PORT = 22
USER = "root"
REMOTE_DIST = "/root/sheetaldies/frontend/dist"
LOCAL_DIST = Path(__file__).parent / "frontend" / "dist"

PASSWORD = "Oceanthryve@2025"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD,
                look_for_keys=False, allow_agent=False, timeout=30)
    print(f"Connected to {HOST}")
except Exception as e:
    print(f"SSH connect failed: {e}")
    sys.exit(1)

sftp = ssh.open_sftp()

def mkdir_p(sftp, remote_path):
    parts = remote_path.split("/")
    current = ""
    for part in parts:
        if not part:
            current = "/"
            continue
        current = current.rstrip("/") + "/" + part
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)

def upload_dir(sftp, local_dir, remote_dir):
    mkdir_p(sftp, remote_dir)
    for item in Path(local_dir).iterdir():
        remote_path = remote_dir.rstrip("/") + "/" + item.name
        if item.is_dir():
            upload_dir(sftp, item, remote_path)
        else:
            print(f"  {item} -> {remote_path}")
            sftp.put(str(item), remote_path)

print(f"Uploading {LOCAL_DIST} -> {REMOTE_DIST}")
upload_dir(sftp, LOCAL_DIST, REMOTE_DIST)

sftp.close()
ssh.close()
print("Done!")
