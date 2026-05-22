import os
import sys
import subprocess
import paramiko

os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["PYTHONUNBUFFERED"] = "1"

HOST        = "72.61.248.205"
USER        = "root"
PASSWORD    = "Oceanthryve@2025"
PM2_NAME    = "sheetal-erp-backend"

LOCAL_ROOT      = r"c:\Users\ACER\Desktop\sheetaldies erp project"
LOCAL_FRONTEND  = os.path.join(LOCAL_ROOT, "frontend")
LOCAL_DIST      = os.path.join(LOCAL_FRONTEND, "dist")
LOCAL_BACKEND   = os.path.join(LOCAL_ROOT, "backend")
LOCAL_BACKEND_SRC    = os.path.join(LOCAL_BACKEND, "src")
LOCAL_BACKEND_PRISMA = os.path.join(LOCAL_BACKEND, "prisma")
LOCAL_NGINX_CONF = os.path.join(LOCAL_ROOT, "nginx-codeprana.conf")

REMOTE_NGINX_CONF = "/etc/nginx/sites-available/codeprana.conf"

REMOTE_ROOT    = "/root/sheetaldies"
REMOTE_BACKEND = f"{REMOTE_ROOT}/backend"
REMOTE_DIST    = f"{REMOTE_ROOT}/frontend/dist"

BACKEND_FILES = [
    (os.path.join(LOCAL_BACKEND, "package.json"),       f"{REMOTE_BACKEND}/package.json"),
    (os.path.join(LOCAL_BACKEND, "package-lock.json"),  f"{REMOTE_BACKEND}/package-lock.json"),
]

SKIP_DIRS = {"node_modules", ".git", "__pycache__", "dist", "uploads", "logs"}
SKIP_EXTS = {".log", ".pid"}


def p(text):
    """Print with immediate flush to avoid buffering issues."""
    print(text, flush=True)


def safe_print(text):
    if isinstance(text, bytes):
        text = text.decode("utf-8", errors="replace")
    print(text.encode("ascii", errors="replace").decode("ascii"), end="", flush=True)


def banner(title):
    p("=" * 60)
    p(title)
    p("=" * 60)


def run(ssh, command, timeout=300):
    p(f"\n[CMD] {command}")
    _, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    out = stdout.read()
    err = stderr.read()
    code = stdout.channel.recv_exit_status()
    safe_print(out)
    if err:
        safe_print(err)
    p(f"[exit {code}]")
    return out.decode("utf-8", errors="replace"), err.decode("utf-8", errors="replace"), code


def sftp_mkdir(sftp, path):
    try:
        sftp.stat(path)
    except FileNotFoundError:
        parts = path.strip("/").split("/")
        cur = ""
        for part in parts:
            cur += "/" + part
            try:
                sftp.stat(cur)
            except FileNotFoundError:
                sftp.mkdir(cur)


def upload_file(sftp, local_path, remote_path):
    if not os.path.exists(local_path):
        p(f"  [SKIP] missing: {local_path}")
        return
    sftp_mkdir(sftp, "/".join(remote_path.split("/")[:-1]))
    sftp.put(local_path, remote_path)
    p(f"  uploaded: {remote_path}")


def upload_dir(sftp, local_dir, remote_dir):
    count = 0
    for root, dirs, files in os.walk(local_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        rel = os.path.relpath(root, local_dir)
        remote_sub = remote_dir if rel == "." else remote_dir + "/" + rel.replace(os.sep, "/")
        sftp_mkdir(sftp, remote_sub)
        for f in files:
            if os.path.splitext(f)[1] in SKIP_EXTS:
                continue
            try:
                sftp.put(os.path.join(root, f), remote_sub + "/" + f)
                count += 1
            except Exception as ex:
                p(f"  [SKIP] {f}: {ex}")
    p(f"  {count} files: {local_dir} -> {remote_dir}")


def build_frontend():
    banner("[LOCAL] Building frontend (vite build)")
    if not os.path.isdir(LOCAL_FRONTEND):
        raise RuntimeError(f"Frontend folder not found: {LOCAL_FRONTEND}")
    subprocess.check_call("npm install", cwd=LOCAL_FRONTEND, shell=True)
    subprocess.check_call("npm run build", cwd=LOCAL_FRONTEND, shell=True)
    if not os.path.isdir(LOCAL_DIST):
        raise RuntimeError(f"Build done but dist missing: {LOCAL_DIST}")
    p("[OK] Frontend built.")


def main():
    banner("Sheetal Dies ERP -- Deploy (backend + frontend)")

    # Step 0: Build frontend locally
    try:
        build_frontend()
    except Exception as e:
        p(f"\n[ERROR] Frontend build failed: {e}")
        sys.exit(1)

    p(f"\n[CONNECT] {HOST} ...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
        p("[OK] Connected.")
    except Exception as e:
        p(f"[ERROR] SSH failed: {e}")
        sys.exit(1)

    sftp = None
    try:
        sftp = ssh.open_sftp()

        # Step 1: Ensure server directories exist
        banner("[STEP 1] Ensuring server directories")
        run(ssh, "mkdir -p /root/sheetaldies/backend/uploads/jobcards "
                 "/root/sheetaldies/backend/uploads/items "
                 "/root/sheetaldies/backend/uploads/machines "
                 "/root/sheetaldies/backend/uploads/parts", timeout=30)

        # Step 2: Upload backend package files
        banner("[STEP 2] Uploading backend package files")
        for local_path, remote_path in BACKEND_FILES:
            upload_file(sftp, local_path, remote_path)

        # Step 3: Upload backend/src (full replace)
        banner("[STEP 3] Uploading backend/src")
        run(ssh, f"rm -rf {REMOTE_BACKEND}/src", timeout=120)
        upload_dir(sftp, LOCAL_BACKEND_SRC, f"{REMOTE_BACKEND}/src")

        # Step 4: Upload backend/prisma (full replace)
        banner("[STEP 4] Uploading backend/prisma")
        run(ssh, f"rm -rf {REMOTE_BACKEND}/prisma", timeout=120)
        upload_dir(sftp, LOCAL_BACKEND_PRISMA, f"{REMOTE_BACKEND}/prisma")

        # Step 5: npm install
        banner("[STEP 5] npm install (backend)")
        run(ssh, f"cd {REMOTE_BACKEND} && npm install --omit=dev 2>&1 | tail -10", timeout=300)

        # Step 6: Prisma generate + migrate
        banner("[STEP 6] Prisma generate + migrate deploy")
        run(ssh, f"cd {REMOTE_BACKEND} && npx prisma generate 2>&1 | tail -5", timeout=120)
        run(ssh, f"cd {REMOTE_BACKEND} && npx prisma migrate deploy 2>&1", timeout=180)

        # Step 7: PM2 restart
        banner("[STEP 7] PM2 restart")
        run(ssh, f"pm2 restart {PM2_NAME} 2>&1 | cat", timeout=60)
        run(ssh, f"sleep 3 && pm2 show {PM2_NAME} 2>&1 | cat | head -30", timeout=30)

        # Step 8: Upload frontend dist
        banner("[STEP 8] Uploading frontend dist")
        run(ssh, f"rm -rf {REMOTE_DIST}", timeout=120)
        upload_dir(sftp, LOCAL_DIST, REMOTE_DIST)
        p("[OK] Frontend dist uploaded.")

        # Step 9: Update nginx config and reload
        banner("[STEP 9] Updating nginx config")
        upload_file(sftp, LOCAL_NGINX_CONF, REMOTE_NGINX_CONF)
        _, _, code = run(ssh, "nginx -t 2>&1", timeout=30)
        if code == 0:
            run(ssh, "systemctl reload nginx 2>&1", timeout=30)
            p("[OK] Nginx reloaded.")
        else:
            p("[WARN] nginx -t failed -- config NOT reloaded. Check syntax.")

        banner("[SUCCESS] Deploy complete.")
        p(f"  Backend : {REMOTE_BACKEND}")
        p(f"  Frontend: {REMOTE_DIST}")

    except Exception as e:
        p(f"\n[ERROR] Deploy failed: {e}")
        sys.exit(1)
    finally:
        if sftp:
            try:
                sftp.close()
            except Exception:
                pass
        ssh.close()
        p("\n[INFO] SSH connection closed.")


if __name__ == "__main__":
    main()
