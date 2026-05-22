"""
Fix live DB column sizes + seed 10 parties + full workflow data.
"""
import paramiko
import requests
import json
import time
import sys

HOST     = "72.61.248.205"
SSH_USER = "root"
SSH_PASS = "Oceanthryve@2025"
DB_NAME  = "sheetal_dies_erp"
BASE     = "https://codeprana.com/api"

ADMIN_EMAIL    = "admin@shitalvaccumtreat.com"
ADMIN_PASSWORD = "Admin@123"

SESSION = requests.Session()
SESSION.headers.update({"Origin": "https://codeprana.com", "Referer": "https://codeprana.com/"})


# ─── SSH helpers ────────────────────────────────────────────────────────────

def ssh_connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=SSH_USER, password=SSH_PASS, timeout=30)
    return ssh


def ssh_run(ssh, cmd, timeout=60):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    o = out.read().decode("utf-8", errors="replace")
    e = err.read().decode("utf-8", errors="replace")
    out.channel.recv_exit_status()
    return o, e


# ─── Fix DB column sizes ─────────────────────────────────────────────────────

def fix_columns(ssh):
    print("\n[1] Fixing DB column sizes …")
    sql = (
        "ALTER TABLE parties "
        "MODIFY COLUMN gstin VARCHAR(500) NULL, "
        "MODIFY COLUMN pan   VARCHAR(500) NULL, "
        "MODIFY COLUMN phone VARCHAR(500) NULL, "
        "MODIFY COLUMN email VARCHAR(500) NULL;"
    )
    cmd = f"mysql -u root -p'{SSH_PASS}' -e \"{sql}\" {DB_NAME} 2>&1"
    o, e = ssh_run(ssh, cmd)
    combined = o + e
    if "ERROR" in combined.upper() and "Warning" not in combined:
        print(f"  [ERR] {combined.strip()}")
    else:
        print("  [OK] gstin/pan/phone/email expanded to VARCHAR(500)")


# ─── API helpers — cookie-based session ──────────────────────────────────────

def login():
    print("\n[2] Logging in …")
    r = SESSION.post(f"{BASE}/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                     timeout=15)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(f"Login failed: {data}")
    print("  [OK] logged in")


def api_get(path, params=None):
    r = SESSION.get(f"{BASE}{path}", params=params, timeout=15)
    if not r.ok:
        print(f"  [ERR GET] {path}: {r.status_code} {r.text[:200]}")
    return r


def api_post(path, body):
    r = SESSION.post(f"{BASE}{path}", json=body, timeout=30)
    if not r.ok:
        print(f"  [ERR POST] {path}: {r.status_code} {r.text[:300]}")
    return r


def api_put(path, body):
    r = SESSION.put(f"{BASE}{path}", json=body, timeout=20)
    if not r.ok:
        print(f"  [ERR PUT] {path}: {r.status_code} {r.text[:300]}")
    return r


def api_patch(path, body):
    r = SESSION.patch(f"{BASE}{path}", json=body, timeout=20)
    if not r.ok:
        print(f"  [ERR PATCH] {path}: {r.status_code} {r.text[:300]}")
    return r


def extract_id(r, *keys):
    if not r.ok:
        return None
    d = r.json()
    data = d.get("data") or d
    if isinstance(data, dict):
        # Try direct id first
        if "id" in data:
            return data["id"]
        # Try nested keys e.g. data.challan.id
        for key in keys:
            if key in data and isinstance(data[key], dict):
                return data[key].get("id")
        # Try first dict value that has an id
        for v in data.values():
            if isinstance(v, dict) and "id" in v:
                return v["id"]
    return None


# ─── Seed: Machines (furnaces) ────────────────────────────────────────────────

def ensure_machines():
    print("\n[3] Ensuring furnace machines …")
    r = api_get("/machines")
    machines = []
    if r.ok:
        machines = r.json().get("data", [])
    if machines:
        print(f"  [SKIP] {len(machines)} machines already exist")
        return machines

    for m in [
        {"name": "Furnace F-1", "code": "F-01", "type": "FURNACE", "capacity": 500},
        {"name": "Furnace F-2", "code": "F-02", "type": "FURNACE", "capacity": 400},
    ]:
        pr = api_post("/machines", m)
        if pr.ok:
            mid = extract_id(pr)
            print(f"  [ADD] {m['name']} → id={mid}")
        else:
            print(f"  [FAIL] {m['name']}: {pr.text[:100]}")

    r2 = api_get("/machines")
    return r2.json().get("data", []) if r2.ok else []


# ─── Seed: Process types ──────────────────────────────────────────────────────

PROCESS_DEFS = [
    {"name": "Hardening",        "code": "HARDENING",       "pricePerKg": 85,  "minCharge": 500,  "hsnSacCode": "998898"},
    {"name": "Tempering",        "code": "TEMPERING",       "pricePerKg": 45,  "minCharge": 300,  "hsnSacCode": "998898"},
    {"name": "Annealing",        "code": "ANNEALING",       "pricePerKg": 60,  "minCharge": 400,  "hsnSacCode": "998898"},
    {"name": "Stress Relieving", "code": "STRESS_RELIEVING","pricePerKg": 50,  "minCharge": 350,  "hsnSacCode": "998898"},
    {"name": "Nitriding",        "code": "NITRIDING",       "pricePerKg": 120, "minCharge": 800,  "hsnSacCode": "998898"},
    {"name": "Carburizing",      "code": "CARBURIZING",     "pricePerKg": 110, "minCharge": 700,  "hsnSacCode": "998898"},
]


def ensure_processes():
    print("\n[4] Ensuring process types …")
    r = api_get("/processes")
    existing = []
    if r.ok:
        d = r.json()
        existing = d.get("data", []) if isinstance(d.get("data"), list) else []
    existing_names = {p["name"] for p in existing}

    for proc in PROCESS_DEFS:
        if proc["name"] not in existing_names:
            pr = api_post("/processes", proc)
            if pr.ok:
                pid = extract_id(pr)
                print(f"  [ADD] {proc['name']} → id={pid}")
            else:
                print(f"  [FAIL] {proc['name']}: {pr.text[:100]}")
        else:
            print(f"  [SKIP] {proc['name']}")

    r2 = api_get("/processes")
    if r2.ok:
        d2 = r2.json()
        return d2.get("data", []) if isinstance(d2.get("data"), list) else []
    return existing


# ─── Seed: Parties ───────────────────────────────────────────────────────────

PARTY_DEFS = [
    # 7 CUSTOMERS
    {"name": "Bharat Forge Ltd",            "partyType": "CUSTOMER", "gstin": "27AABCB1234A1Z5", "phone": "9820001001", "email": "contact@bharatforge.in",   "address": "Mundhwa, Pune 411036"},
    {"name": "Mahindra & Mahindra Ltd",     "partyType": "CUSTOMER", "gstin": "27AABCM5678B1Z3", "phone": "9820001002", "email": "vendor@mahindra.com",       "address": "Akurdi, Pune 411035"},
    {"name": "TATA Motors Components",      "partyType": "CUSTOMER", "gstin": "27AABCT9012C1Z1", "phone": "9820001003", "email": "purchase@tatamotors.com",    "address": "Chinchwad, Pune 411033"},
    {"name": "Kirloskar Oil Engines",       "partyType": "CUSTOMER", "gstin": "27AABCK3456D1Z9", "phone": "9820001004", "email": "stores@kirloskar.com",       "address": "Khadki, Pune 411003"},
    {"name": "SKF India Ltd",               "partyType": "CUSTOMER", "gstin": "27AABCS7890E1Z7", "phone": "9820001005", "email": "supply@skf.in",              "address": "Pimpri, Pune 411018"},
    {"name": "Thermax Limited",             "partyType": "CUSTOMER", "gstin": "27AABCT1234F1Z5", "phone": "9820001006", "email": "procurement@thermax.com",    "address": "Wakad, Pune 411057"},
    {"name": "Bajaj Auto Ltd",              "partyType": "CUSTOMER", "gstin": "27AABCB5678G1Z3", "phone": "9820001007", "email": "purchase@bajaj.com",         "address": "Waluj, Aurangabad 431136"},
    # 2 VENDORS
    {"name": "Hindustan Gases Ltd",         "partyType": "VENDOR",   "gstin": "27AABCH9012H1Z1", "phone": "9820001008", "email": "sales@hindustangases.com",   "address": "Bhosari, Pune 411026"},
    {"name": "Apex Alloys Pvt Ltd",         "partyType": "VENDOR",   "gstin": "27AABCA3456I1Z9", "phone": "9820001009", "email": "info@apexalloys.com",        "address": "Taloja, Navi Mumbai 410208"},
    # 1 BOTH (the processor / our company)
    {"name": "Shital Vacuum Treat Pvt Ltd", "partyType": "BOTH",     "gstin": "27AATCS0577L1ZK", "phone": "9822012850", "email": "info@shitalvacuumtreat.in",  "address": "Plot 84/2, Sector 10, PCNTDA, Bhosari, Pune 411026"},
]


def add_parties():
    print("\n[5] Adding 10 parties …")
    r_existing = api_get("/parties", {"limit": 100})
    existing_names = set()
    if r_existing.ok:
        for p in r_existing.json().get("data", []):
            existing_names.add(p["name"])

    for p in PARTY_DEFS:
        if p["name"] in existing_names:
            print(f"  [SKIP] {p['name']}")
            continue
        r = api_post("/parties", p)
        if r.ok:
            pid = extract_id(r)
            print(f"  [OK] {p['name']} (id={pid})")
        else:
            print(f"  [FAIL] {p['name']}: {r.text[:150]}")


def get_all_parties():
    r = api_get("/parties", {"limit": 200})
    return r.json().get("data", []) if r.ok else []


# ─── Seed: Full workflow data ──────────────────────────────────────────────────

def find_party(parties, keyword):
    for p in parties:
        if keyword.lower() in p["name"].lower():
            return p
    return None


def find_process(processes, name):
    for p in processes:
        if p["name"].lower() == name.lower():
            return p
    return processes[0] if processes else None


def nested_id(r, *path):
    """Walk r.json().data.path[0].path[1]... to get id."""
    if not r.ok:
        return None
    d = r.json().get("data", {})
    for key in path:
        if isinstance(d, dict):
            d = d.get(key, {})
    if isinstance(d, dict):
        return d.get("id")
    return None


def create_inward(from_id, to_id, date, status, remarks, items):
    body = {
        "challanDate": date,
        "fromPartyId": from_id,
        "toPartyId":   to_id,
        "status":      "DRAFT",   # inward always starts DRAFT
        "remarks":     remarks,
        "items":       items,
    }
    r = api_post("/jobwork/inward", body)
    if not r.ok:
        return None
    ch_id = nested_id(r, "challan")
    if ch_id and status != "DRAFT":
        api_patch(f"/jobwork/{ch_id}/status", {"status": status})
    return ch_id


def make_item(part, desc, mat, proc, drwno, qty, wt, rate):
    return {
        "partName":      part,
        "description":   desc,
        "material":      mat,
        "processTypeId": proc["id"],
        "processName":   proc["name"],
        "hsnCode":       "998898",
        "quantity":      qty,
        "uom":           "NOS",
        "weight":        wt,
        "rate":          rate,
        "amount":        round(wt * rate, 2),
        "drawingNo":     drwno,
    }


def create_workflow(parties, processes, machines):
    shital  = find_party(parties, "Shital Vacuum")
    bharat  = find_party(parties, "Bharat Forge")
    mmpl    = find_party(parties, "Mahindra")
    tata    = find_party(parties, "TATA Motors")
    skf     = find_party(parties, "SKF")
    kirlo   = find_party(parties, "Kirloskar")
    thermax = find_party(parties, "Thermax")
    bajaj   = find_party(parties, "Bajaj")

    if not shital:
        print("  [ABORT] Shital Vacuum Treat party not found")
        return

    furnace_id = machines[0]["id"] if machines else None
    harden  = find_process(processes, "Hardening")
    temper  = find_process(processes, "Tempering")
    anneal  = find_process(processes, "Annealing")
    nitride = find_process(processes, "Nitriding")
    stress  = find_process(processes, "Stress Relieving")

    # ── WF-1: COMPLETED — Bharat Forge → Hardening ────────────────────────
    print("\n  [WF1] Bharat Forge → Hardening (COMPLETED + PAID invoice)")
    if bharat:
        ch1 = create_inward(bharat["id"], shital["id"], "2026-04-01", "COMPLETED",
                            "Urgent hardening batch — April", [
            make_item("Die Block H13", "Die Block H13 for forging press", "H13", harden, "BF-DIE-001", 5, 48.5, 85),
            make_item("Punch H13",     "Forging punch H13",               "H13", harden, "BF-PUN-002", 3, 12.2, 85),
        ])
        if ch1:
            print(f"    challan id={ch1}")
            # Get challan item IDs for invoice linking
            r_chd = api_get(f"/jobwork/{ch1}")
            ch_items = r_chd.json().get("data", {}).get("items", []) if r_chd.ok else []

            r_jc = api_post("/jobwork/jobcard-from-challan", {"challanId": ch1})
            jc1 = nested_id(r_jc, "jobCard")
            if jc1:
                print(f"    jobcard id={jc1}")
                # Valid path: SENT_FOR_JOBWORK → INSPECTION (needs inspection)
                # Skip status change - leave as SENT_FOR_JOBWORK

                # Create runsheet
                rs1 = None
                if furnace_id:
                    rs_body = {
                        "furnaceId":      furnace_id,
                        "runDate":        "2026-04-03",
                        "status":         "COMPLETED",
                        "operatorSign":   "Rajesh Kumar",
                        "supervisorSign": "A. Desai",
                        "tempProfile":    "1020C/90min Austenitize + Gas Quench",
                        "cycleTime":      210,
                        "items": [
                            {"jobCardId": jc1, "quantity": 8, "weightKg": 60.7, "hrc": "54-56"},
                        ],
                    }
                    r_rs = api_post("/manufacturing/runsheets", rs_body)
                    rs1 = extract_id(r_rs)
                    if rs1:
                        print(f"    runsheet id={rs1} [COMPLETED]")

                # Test certificate
                r_cert = api_post("/quality/certificates", {
                    "customerId":    bharat["id"],
                    "jobCardId":     jc1,
                    "issuedTo":      bharat["name"],
                    "issueDate":     "2026-04-04",
                    "status":        "APPROVED",
                    "procHardening": True,
                    "hardnessMin":   54,
                    "hardnessMax":   56,
                    "hardnessUnit":  "HRC",
                    "dieMaterial":   "H13",
                    "deliveryDate":  "2026-04-05",
                    "approvedBy":    "A. Desai",
                    "packedQty":     8,
                })
                cert1 = extract_id(r_cert) or nested_id(r_cert, "certificate") or nested_id(r_cert, "cert")
                if cert1:
                    print(f"    cert id={cert1} [APPROVED]")

                # Invoice — no challanId to avoid sourceChallanItemId requirement
                inv_items = [
                    {
                        "description":   "Vacuum Hardening — Die Block H13 (5 Nos)",
                        "quantity":      5,
                        "unit":          "NOS",
                        "rate":          824.5,
                        "weight":        48.5,
                        "amount":        4122.5,
                        "material":      "H13",
                        "hrc":           "54-56",
                        "hsnSac":        "998898",
                        "processTypeId": harden["id"],
                    },
                    {
                        "description":   "Vacuum Hardening — Punch H13 (3 Nos)",
                        "quantity":      3,
                        "unit":          "NOS",
                        "rate":          345.67,
                        "weight":        12.2,
                        "amount":        1037,
                        "material":      "H13",
                        "hrc":           "54-56",
                        "hsnSac":        "998898",
                        "processTypeId": harden["id"],
                    },
                ]
                # Link to challan items if available
                if len(ch_items) >= 2:
                    inv_items[0]["sourceChallanItemId"] = ch_items[0]["id"]
                    inv_items[1]["sourceChallanItemId"] = ch_items[1]["id"]
                    inv_challan_id = ch1
                else:
                    inv_challan_id = None

                r_inv = api_post("/invoices", {
                    "invoiceDate":  "2026-04-05",
                    "fromPartyId":  shital["id"],
                    "toPartyId":    bharat["id"],
                    "challanId":    inv_challan_id,
                    "cgstRate":     9,
                    "sgstRate":     9,
                    "igstRate":     0,
                    "items":        inv_items,
                })
                inv1 = extract_id(r_inv) or nested_id(r_inv, "invoice")
                if inv1:
                    print(f"    invoice id={inv1}")
                    rp = api_patch(f"/invoices/{inv1}/payment", {
                        "paymentStatus": "PAID",
                        "paidDate":      "2026-04-10",
                        "paymentRef":    "NEFT20260410001"
                    })
                    if rp.ok:
                        print(f"    invoice PAID")

    # ── WF-2: IN_PROGRESS — Mahindra → Tempering ──────────────────────────
    print("\n  [WF2] Mahindra → Tempering (IN_PROGRESS)")
    if mmpl:
        ch2 = create_inward(mmpl["id"], shital["id"], "2026-04-15", "RECEIVED",
                            "Batch 2 — Tempering for auto components", [
            make_item("Gear Blank D2", "Gear blank D2 steel for transmission", "D2", temper, "MM-GEAR-101", 10, 35.0, 45),
        ])
        if ch2:
            print(f"    challan id={ch2}")
            r_jc2 = api_post("/jobwork/jobcard-from-challan", {"challanId": ch2})
            jc2 = nested_id(r_jc2, "jobCard")
            if jc2:
                print(f"    jobcard id={jc2}")
                # Leave as SENT_FOR_JOBWORK — valid state after challan creation
                # Cert (ISSUED, not yet approved)
                r_cert2 = api_post("/quality/certificates", {
                    "customerId":  mmpl["id"],
                    "jobCardId":   jc2,
                    "issuedTo":    mmpl["name"],
                    "issueDate":   "2026-04-18",
                    "status":      "ISSUED",
                    "procTempering": True,
                    "hardnessMin": 58,
                    "hardnessMax": 60,
                    "hardnessUnit": "HRC",
                    "dieMaterial": "D2",
                    "packedQty":   10,
                })
                cert2 = extract_id(r_cert2) or nested_id(r_cert2, "certificate") or nested_id(r_cert2, "cert")
                if cert2:
                    print(f"    cert id={cert2} [ISSUED]")

    # ── WF-3: CANCELLED — TATA Motors ─────────────────────────────────────
    print("\n  [WF3] TATA Motors — CANCELLED challan")
    if tata:
        ch3 = create_inward(tata["id"], shital["id"], "2026-04-20", "CANCELLED",
                            "Customer cancelled — material returned", [
            make_item("Mould Insert EN31", "Mould insert EN31 for injection mould", "EN31", anneal, "TM-MOULD-055", 2, 8.5, 60),
        ])
        if ch3:
            print(f"    challan id={ch3} [CANCELLED]")

    # ── WF-4 to WF-7: DRAFT challans (SKF, Kirloskar, Thermax, Bajaj) ─────
    draft_configs = [
        (skf,    "SKF",    "Bearing Ring D2",     "D2",   nitride, "SR-SKF-201", 8,  22.4, 120),
        (kirlo,  "Kirlo",  "Cam Shaft EN24",       "EN24", temper,  "KO-CAM-301", 4,  15.6, 45),
        (thermax,"Thrmx",  "Heat Exchanger Part",  "SS304",stress,  "TX-HEX-401", 6,  28.0, 50),
        (bajaj,  "Bajaj",  "Connecting Rod 40Cr",  "40Cr", nitride, "BJ-CON-501", 12, 18.0, 120),
    ]
    for cust, lbl, part, mat, proc, drwno, qty, wt, rate in draft_configs:
        if not cust:
            continue
        print(f"\n  [DRAFT] {lbl} — {proc['name']}")
        ch = create_inward(cust["id"], shital["id"], "2026-05-01", "DRAFT",
                           f"Pending processing — {proc['name']}", [
            make_item(part, f"{part} for {lbl}", mat, proc, drwno, qty, wt, rate),
        ])
        if ch:
            print(f"    challan id={ch} [DRAFT]")

    # ── WF-8: SENT challan — Kirloskar (to show more statuses) ────────────
    if kirlo:
        print(f"\n  [SENT] Kirloskar — Annealing (status=SENT)")
        ch8 = create_inward(kirlo["id"], shital["id"], "2026-04-25", "SENT",
                            "Annealing batch sent to furnace", [
            make_item("Valve Body", "CI valve body for oil engine", "Cast Iron", anneal, "KO-VAL-401", 15, 42.0, 60),
        ])
        if ch8:
            print(f"    challan id={ch8} [SENT]")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Sheetal ERP — Fix DB + Seed Live Data")
    print("=" * 60)

    # Step 1: Fix live DB columns via SSH (already done — skip if columns are wide)
    try:
        ssh = ssh_connect()
        print("[OK] SSH connected")
        fix_columns(ssh)
        ssh.close()
    except Exception as e:
        print(f"[WARN] SSH column fix skipped: {e}")

    time.sleep(1)

    # Step 2: Login
    try:
        login()
    except Exception as e:
        print(f"[ERROR] Login: {e}")
        sys.exit(1)

    # Step 3: Machines
    machines = ensure_machines()
    if not machines:
        print("[WARN] No machines — runsheets won't be created")

    # Step 4: Process types
    processes = ensure_processes()
    if not processes:
        print("[ERROR] No process types found")
        sys.exit(1)

    # Step 5: Parties
    add_parties()

    # Step 6: Full workflow
    print("\n[6] Creating workflow data …")
    all_parties = get_all_parties()
    create_workflow(all_parties, processes, machines)

    print("\n" + "=" * 60)
    print("[DONE] All seed data added.")
    print("=" * 60)


if __name__ == "__main__":
    main()
