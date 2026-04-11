# ERP Workflow Guide for Customers

## Overview
This guide explains the ERP workflow in simple English. It shows how to start work, add parties and materials, create jobs, and use the main system steps.

Main steps:
1. Login
2. Add parties and materials
3. Create a Job Card
4. Create Job Work / Challan
5. Create Quality Certificate
6. Create Invoice
7. Dispatch items
8. Use Purchase and Inventory
9. Use Manufacturing planning and reports
10. View Analytics

---

## 1. Login
- Go to the `Login` page.
- Use email/password or OTP.
- After login, the `Dashboard` opens.

### Dashboard notes
- See production status.
- See job card summary.
- See pending invoices.
- Use quick actions like `New Job Card`, `New Challan`, `New Certificate`.

---

## 2. Add Parties and Materials
Before creating a job, add parties and materials.

### Add party
- Go to the `Admin` or `Parties` section.
- Click `New Party` or `Add Party`.
- Fill party name, address, GST, PAN, and type (Customer/Vendor/Both).
- Save the party.
- Use the party later in job work or invoices.

### Add material or item
- Go to the `Items` or `Materials` section.
- Click `New Item` or `Add Item`.
- Fill item name, part number, material, drawing number, HSN, UOM, rate, and weight.
- Save the item.
- Use the item later in Job Card or Job Work.

---

## 3. Create a Job Card
Job Card starts production work for a part.

### How to create
1. Go to `Job Cards`.
2. Click `New Job Card`.
3. Select party, part, and machine.
4. Choose material and quantity.
5. Choose process and pricing if needed.
   - Process selection can come from `Pricing` or `Process` section.
   - If you have a process list, choose the process from there.
6. Fill any job notes.
7. Save the Job Card.

### Why use Job Card
- To start manufacturing work.
- To track production on a machine.

---

## 3.1 After Job Card is Created - Next Steps
Once a Job Card is created, the next steps are:

1. Review the Job Card details.
   - Check the selected party.
   - Check the part or item details.
   - Check selected material and quantity.
   - Check machine and process.
2. Confirm prices and process selection.
   - If process is not yet defined, use `Pricing` or `Processes` to add the right process.
   - Use the job rate or item rate from the `Items` section.
3. Prepare for job work.
   - If work must go to a vendor, identify the correct `To Party`.
   - If work is internal, choose the correct `From Party` and machine.
4. Create a Job Work / Challan.
   - Use the saved Job Card in the Job Work screen.
   - Add materials, dispatch date, due date, transport details, and charges.
5. Track the work until it is ready for inspection.
   - Use the Job Work list to follow status.
   - Update status if work is in progress, sent for job work, or completed.

### Detailed next actions after Job Card
- Open the Job Card from the `Job Cards` list.
- Confirm the job description and the processes assigned.
- Check that the material is added correctly.
  - If material is missing, add it first in `Items`.
- Confirm the machine and process path.
  - If the process is from `Pricing`, verify the process name and rate.
- If a job needs job work, move to `Job Work` next.
- Otherwise, if the job will stay in production, update the status and schedule the machine work.
- After the work is done, create the Quality Certificate.

---

## 4. Create Job Work / Challan
Job Work or Challan links a Job Card to actual processing and transport.

### How to create
1. Go to `Job Work`.
2. Click `New Challan` or `New Job Work`.
3. Choose `From Party` and `To Party`.
4. Select the Job Card.
5. Add items and materials for this work.
6. Add dispatch date, due date, transport details, and charges.
7. Save the challan.

### Why use it
- To send items to a vendor or heat treatment.
- To track movement of work.
- To link processing with the Job Card.

---

## 5. Create Quality Certificate
Use this step after job work is finished and inspection is done.

### How to create
1. Go to `Quality` or `Certificates`.
2. Click `New Certificate`.
3. Select the Job Card.
4. Add inspection details and results.
5. Attach photos if available.
6. Add temperature cycle or process information.
7. Save the certificate.

### Why use it
- To record inspection results.
- To prove quality to customers.
- To keep quality documentation.

---

## 6. Create Invoice
Invoice is the billing document for the work.

### How to create
1. Go to `Invoices`.
2. Click `New Invoice`.
3. Choose the Challan or Job Work reference.
4. Add customer, item, and price details.
5. Check GST and totals.
6. Save the invoice.

### Payment and Tally
- Mark the invoice as paid when payment is received.
- If Tally is connected, push the invoice to Tally.
- You can also download XML if needed.

---

## 7. Dispatch the items
Dispatch is the delivery step after work is ready.

### How to create dispatch
1. Go to `Dispatch`.
2. Click `New Dispatch Challan`.
3. Add the Job Work or Invoice reference.
4. Fill vehicle, delivery person, and mode.
5. Save the dispatch.

### Why use it
- To track delivery status.
- To link shipping with invoices.
- To manage the dispatch process.

---

## 8. Use Purchase and Inventory
If you need raw material or stock, use Purchase and Inventory.

### Purchase steps
- Go to `Purchase Orders`.
- Click `New Purchase Order`.
- Select vendor and items.
- Save the order.
- If goods arrive, create a GRN (Goods Receipt Note).

### Inventory steps
- Go to `Inventory View`.
- Check stock levels.
- See low stock items.
- Track material movements.
- Update inventory when stock changes.

---

## 9. Manufacturing Planning and Reports
Use manufacturing screens for production planning.

### Manufacturing steps
- Create `Manufacturing Batches`.
- Add `VHT Run Sheets` for heat treatment records.
- Use `Daily Furnace Planning` for furnace slots.
- View reports like machine utilization, idle time, and plant losses.

---

## 10. View Analytics
Analytics helps you see ERP performance.

### What you can see
- Revenue and job trends.
- Inspection pass/fail rates.
- Process distribution.
- Material-wise analytics.
- Payment status and turnaround.

### Why use analytics
- To make better decisions.
- To watch production efficiency.
- To understand finance and quality.

---

## Start here
1. Login.
2. Add parties and materials.
3. Create a Job Card.
4. Create Job Work / Challan.
5. Create Quality Certificate.
6. Create Invoice.
7. Create Dispatch.
8. Use Purchase / Inventory if needed.
9. Review Analytics.

---

## Simple flow
1. Add parties (Customer/Vendor).
2. Add materials or items.
3. Create Job Card using party, material, and process.
4. Create Job Work / Challan from the Job Card.
5. Create Quality Certificate after work is done.
6. Create Invoice for billing.
7. Dispatch the items.
8. Use purchase when raw material is needed.
9. Check analytics for results.

---

## Notes
- Add parties before creating jobs.
- Add materials before using them in a Job Card.
- Process can be chosen from the Pricing or Process section.
- If you need a new process type, add it in `Pricing` or `Processes` before job creation.

---

## Final advice
Start with `Job Card`, then follow `Job Work → Quality → Invoice → Dispatch`. Use the Dashboard for quick actions and the Admin sections to add parties and materials.
