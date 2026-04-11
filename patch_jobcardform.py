import re

with open("frontend/src/pages/jobcard/JobCardForm.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
content = content.replace("import api from '../../utils/api';", 
"""import api from '../../utils/api';
import { useQueryClient } from '@tanstack/react-query';
import { useItems, useMachines, useParties } from '../../hooks/useMasterData';""")

# 2. Add queryClient and use master data
# Find: const [parts,     setParts]     = useState([]);
#       const [machines,  setMachines]  = useState([]);
#       const [customers, setCustomers] = useState([]);
target_state = """  const [parts,     setParts]     = useState([]);
  const [machines,  setMachines]  = useState([]);
  const [customers, setCustomers] = useState([]);"""

replacement_state = """  const queryClient = useQueryClient();
  const { data: parts = [] } = useItems();
  const { data: machines = [] } = useMachines();
  const { data: customers = [] } = useParties();"""
content = content.replace(target_state, replacement_state)

# 3. Rewrite the giant useEffect
# We need to cut out the Promise.all for items, machines, parties, 
# and only leave the ID fetching logic for the job card.
# The original useEffect looks like:
#   useEffect(() => {
#     let cancelled = false;
#     (async () => {
# ...
#           api.get('/items'),
#           api.get('/machines'),
# ...
#         setParts(itemsR.data.data);
#         setMachines(machR.data.data);
#         let list = partiesR.data.data || [];
# ...
#         if (isEdit) {
#            ...
#         }
#         list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
#         if (!cancelled) setCustomers(list);
#       } catch (e) {
#         console.error(e);
#       }
#     })();
#     return () => { cancelled = true; };
#   }, [id, isEdit]);

# We will just write a regex to replace that whole block carefully.
target_effect_regex = r"  useEffect\(\(\) => \{.+?return \(\) => \{ cancelled = true; \};\n  \}, \[id, isEdit\]\);"

replacement_effect = """  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isEdit) {
          const jr = await api.get(`/jobcards/${id}`);
          if (cancelled) return;
          const d = jr.data.data;
          setCardData(d);
          
          setForm({
            partId:       d.partId       || '',
            dieNo:        d.dieNo        || '',
            yourNo:       d.yourNo       || '',
            heatNo:       d.heatNo       || '',
            dieMaterial:  d.dieMaterial  || '',
            customerId:   d.customerId   ? String(d.customerId) : '',
            operationNo:  d.operationNo  || '',
            drawingNo:    d.drawingNo    || '',
            machineId:    d.machineId    || '',
            operatorName: d.operatorName || '',
            quantity:     d.quantity     || '',
            totalWeight:  d.totalWeight  || '',
            startDate:    d.startDate    ? d.startDate.split('T')[0]    : '',
            receivedDate: d.receivedDate ? d.receivedDate.split('T')[0] : '',
            dueDate:      d.dueDate      ? d.dueDate.split('T')[0]      : '',
            endDate:      d.endDate      ? d.endDate.split('T')[0]      : '',
            issueDate:    d.issueDate    ? d.issueDate.split('T')[0]    : '',
            issueBy:      d.issueBy      || '',
            certificateNo: d.certificateNo || '',
            customerNameSnapshot: d.customerNameSnapshot || '',
            customerAddressSnapshot: d.customerAddressSnapshot || '',
            factoryName: d.factoryName || 'SHITAL VACUUM TREAT PVT LTD.',
            factoryAddress: d.factoryAddress || 'Plot No.84/1, Sector No.10, PCNTDA, Bhosari, Pune',
            contactEmail: d.contactEmail || 'info@shitalgroup.com',
            dispatchByOurVehicle: d.dispatchByOurVehicle || false,
            dispatchByCourier: d.dispatchByCourier || false,
            collectedByCustomer: d.collectedByCustomer || false,
            hrcRange: d.hrcRange || '',
            specialRequirements: d.specialRequirements || '',
            precautions: d.precautions || '',
            documentNo: d.documentNo || 'QF-PD-01',
            revisionNo: d.revisionNo || '01',
            revisionDate: d.revisionDate ? d.revisionDate.split('T')[0] : '',
            pageNo: d.pageNo || '1 OF 2',
            remarks:       d.remarks       || '',
            dispatchMode: d.dispatchMode || '',
            status:        d.status        || 'CREATED',
            operationMode: d.operationMode || 'NORMAL',
            specInstrCert: d.specInstrCert || false,
            specInstrMPIRep: d.specInstrMPIRep || false,
            specInstrGraph: d.specInstrGraph || false,
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);"""

content = re.sub(target_effect_regex, replacement_effect, content, flags=re.DOTALL)

# 4. Fix mutations (quick add) for parts
target_part_add = "setParts(prev => [...prev, created].sort((a, b) => a.partNo.localeCompare(b.partNo)));"
replacement_part_add = "queryClient.setQueryData(['items'], (old) => old ? [...old, created].sort((a, b) => a.partNo.localeCompare(b.partNo)) : [created]);"
content = content.replace(target_part_add, replacement_part_add)

# 5. Fix mutations for customers
target_cust_add_regex = r"setCustomers\(\(prev\) => \{\s*if \(prev\.some\(\(x\) => String\(x\.id\) === customerIdOut\)\) return prev;\s*return \[\.\.\.prev, pr\.data\.data\]\.sort\(\(a, b\) => \(a\.name \|\| ''\)\.localeCompare\(b\.name \|\| ''\)\);\s*\}\);"
replacement_cust_add = "queryClient.setQueryData(['parties'], (old) => old ? [...old, pr.data.data].sort((a, b) => (a.name || '').localeCompare(b.name || '')) : [pr.data.data]);"
content = re.sub(target_cust_add_regex, replacement_cust_add, content, flags=re.DOTALL)


with open("frontend/src/pages/jobcard/JobCardForm.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("SUCCESSFULLY PATCHED JobCardForm.jsx")
