import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Check, Link2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCycleSegments, segmentsToTempCycleData } from '../../data/heatTreatmentCycles';

// UI Components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Stepper, useStepper } from '@/components/ui/stepper';
import { FormErrorSummary } from '@/components/ui/field';

// Master Data Hooks
import { useParties, useMasterJobCards, useProcesses } from '../../hooks/useMasterData';

// Form Subcomponents
import CertHeaderSection from './components/CertHeaderSection';
import CertTechnicalSection from './components/CertTechnicalSection';
import CertCategorizationSection from './components/CertCategorizationSection';
import CertHardnessSection from './components/CertHardnessSection';
import CertPackingSection from './components/CertPackingSection';
import CertPhotosSection from './components/CertPhotosSection';

// Shared Components
import CertItemsTable from './components/CertItemsTable';
import DistortionTable from './components/DistortionTable';
import TemperatureCurve from './components/TemperatureCurve';

function extractDist(arr) {
  if (!arr) return Array(8).fill('');
  const parsed = typeof arr === 'string' ? JSON.parse(arr) : arr;
  const out = Array(8).fill('');
  (Array.isArray(parsed) ? parsed : []).forEach((v, i) => {
    out[i] = v != null && typeof v === 'object' ? String(v.val ?? '') : String(v ?? '');
  });
  return out;
}

export default function CertForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: editId } = useParams();
  const isEdit = !!editId;
  const { data: parties = [] } = useParties();
  const { data: jobCards = [] } = useMasterJobCards();
  const { data: processes = [] } = useProcesses();

  const [images,        setImages]        = useState({});
  const [removedImages, setRemovedImages] = useState(new Set());
  const [existingImages, setExistingImages] = useState({});
  const [jcImages,      setJcImages]      = useState({});
  const [loading,   setLoading]   = useState(false);
  const [loadingCert, setLoadingCert] = useState(isEdit);
  const [jcData,    setJcData]    = useState(null); // locked job card snapshot

  const today = new Date().toISOString().split('T')[0];

  const genCertNo = () => {
    const now = new Date();
    const yy  = String(now.getFullYear()).slice(-2);
    const mm  = String(now.getMonth() + 1).padStart(2, '0');
    return `${yy}${mm}101`;
  };

  // Support ?jobCardNo=JC-001 link from certificate list search
  const jobCardNoParam = searchParams.get('jobCardNo') || '';
  const resolvedJobCardId = useMemo(() => {
    if (searchParams.get('jobCardId')) return searchParams.get('jobCardId');
    if (jobCardNoParam && jobCards.length) {
      const match = jobCards.find(jc => jc.jobCardNo === jobCardNoParam);
      return match ? String(match.id) : '';
    }
    return '';
  }, [searchParams, jobCardNoParam, jobCards]);

  const [form, setForm] = useState({
    jobCardId: searchParams.get('jobCardId') || '', yourPoNo: '', yourPoDate: '', yourRefNo: '',
    issueNo: genCertNo(), issueDate: today, checkedBy: '',
    customerId: '', issuedByPartyId: '',
    dieMaterial: '', operatorMode: '', 
    specInstrCertificate: true, specInstrMpiReport: false, specInstrProcessGraph: false,
    deliveryDate: '', specialRequirements: '', precautions: '',
    catNormal: false, catCrackRisk: false, catDistortionRisk: false,
    catCriticalFinishing: false, catDentDamage: false, catCavity: false, catOthers: false,
    procStressRelieving: false, procHardening: false, procTempering: false, procAnnealing: false,
    procBrazing: false, procPlasmaNitriding: false, procSubZero: false, procSoakClean: false,
    visualBefore: false, visualAfter: true, mpiBefore: false, mpiAfter: false, mpiNil: true,
    hardnessMin: '', hardnessMax: '', hardnessUnit: 'HRC', achievedHardness: '',
    hardnessAfter1: '', hardnessAfter2: '', hardnessAfter3: '', hardnessAfter4: '',
    distortionBefore: Array(8).fill(''), distortionAfter: Array(8).fill(''),
    packedQty: '', packedBy: '', approvedBy: '', finalInspectionBy: '',
    issuedTo: '', heatNo: '', dispatchByOurVehicle: false, dispatchByCourier: false, collectedByCustomer: false,
    dispatchChallanNo: '', dispatchChallanDate: '', dispatchedThrough: '',
    specialInstruction: '',
  });

  const [certItems, setCertItems] = useState([
    { description: '', quantity: '1', weightPerPc: '', totalWeight: '', samplingPlan: '', remarks: '' },
  ]);

  // Item selection state
  const [pendingCertItems,   setPendingCertItems]   = useState([]);  // available to certify
  const [certifiedItems,     setCertifiedItems]     = useState([]);  // already certified
  const [selectedItemIds,    setSelectedItemIds]    = useState(new Set());
  const [loadingCertItems,   setLoadingCertItems]   = useState(false);

  const [tempRows, setTempRows] = useState([{ time: '', temp: '' }]);
  // True once the user manually edits the temp-curve rows; prevents auto-reset on job-card change
  const tempRowsUserEdited = useRef(false);

  // Temp Cycle Graph master selection (declared here so the edit-load effect below
  // can restore the previously-selected graph into the dropdown).
  const [noDefaultTemplate, setNoDefaultTemplate] = useState(false);
  const [masterGraphs, setMasterGraphs] = useState([]);
  const [selectedGraphId, setSelectedGraphId] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Wizard steps ──────────────────────────────────────────────
  const CERT_STEPS = [
    { key: 'job',    label: 'Job card',   full: 'Job card & customer' },
    { key: 'items',  label: 'Items',      full: 'Items' },
    { key: 'cat',    label: 'Technical',  full: 'Technical & categorization' },
    { key: 'hard',   label: 'Hardness',   full: 'Hardness & distortion' },
    { key: 'temp',   label: 'Temp cycle', full: 'Temperature cycle' },
    { key: 'pack',   label: 'Packing',    full: 'Packing & photos' },
    { key: 'review', label: 'Review',     full: 'Review & save' },
  ];
  const LAST_STEP = CERT_STEPS.length - 1;
  const wiz = useStepper(CERT_STEPS.length);
  const [certErrors, setCertErrors] = useState({});

  const loadTempCycleFromRunsheet = async (jobCardId) => {
    if (!jobCardId) return false;
    try {
      const r = await api.get('/quality/certificates/suggested-temp-cycle', { params: { jobCardId } });
      const cycle = r.data.data?.tempCycleData;
      if (cycle?.length) {
        setTempRows(cycle.map((p) => ({ time: String(p.time ?? ''), temp: String(p.temp ?? '') })));
        const rn = r.data.data.runsheet?.runsheetNumber;
        toast.success(rn ? `Curve loaded from VHT Run Sheet ${rn}` : 'Curve loaded from VHT Run Sheet', { duration: 3500 });
        return true;
      }
    } catch { /* fall back */ }
    return false;
  };

  // Log-sheet row count — the physical form has a fixed 20 rows regardless
  // of which material's cycle is loaded, so every material's default is
  // normalized to exactly 20 (padded with blank rows to fill in manually, or
  // trimmed from the tail if the cycle naturally produces more).
  const TEMP_CYCLE_ROW_COUNT = 20;
  const normalizeRowCount = (data) => {
    if (data.length === TEMP_CYCLE_ROW_COUNT) return data;
    if (data.length < TEMP_CYCLE_ROW_COUNT) {
      return [...data, ...Array(TEMP_CYCLE_ROW_COUNT - data.length).fill(null).map(() => ({ time: '', temp: '' }))];
    }
    return data.slice(0, TEMP_CYCLE_ROW_COUNT);
  };

  // Derive temp/time rows from the canonical heat-treatment cycle definitions
  // (frontend/src/data/heatTreatmentCycles.js). Falls back to D2 if the
  // treatmentType is unknown (e.g. 'NORMAL' / 'REWORK').
  const updateTemperatureCycle = (treatmentType) => {
    const segments = getCycleSegments(treatmentType);
    const segs = segments.length ? segments : getCycleSegments('D2');
    const data = normalizeRowCount(segmentsToTempCycleData(segs));
    if (!data.length) return;
    setTempRows(data.map(p => ({ time: String(p.time), temp: String(p.temp) })));
  };

  // Load existing cert in edit mode
  useEffect(() => {
    if (!isEdit) return;
    setLoadingCert(true);
    api.get(`/quality/certificates/${editId}`)
      .then(r => {
        const c = r.data.data;
        const extractDistLocal = (arr) => {
          if (!arr) return Array(8).fill('');
          const parsed = typeof arr === 'string' ? JSON.parse(arr) : arr;
          const out = Array(8).fill('');
          parsed.forEach((v, i) => { out[i] = v != null && typeof v === 'object' ? String(v.val ?? '') : String(v ?? ''); });
          return out;
        };
        setForm({
          jobCardId:            c.jobCardId ? String(c.jobCardId) : '',
          yourPoNo:             c.yourPoNo  || '',
          yourPoDate:           c.yourPoDate ? c.yourPoDate.slice(0,10) : '',
          yourRefNo:            c.yourRefNo || '',
          issueNo:              c.certNo    || c.issueNo || '',
          issueDate:            c.issueDate ? c.issueDate.slice(0,10) : '',
          checkedBy:            c.checkedBy || '',
          customerId:           c.customerId ? String(c.customerId) : '',
          issuedByPartyId:      c.issuedByPartyId ? String(c.issuedByPartyId) : '',
          dieMaterial:          c.dieMaterial  || '',
          operatorMode:         c.operatorMode || '',
          specInstrCertificate:  !!c.specInstrCertificate,
          specInstrMpiReport:    !!c.specInstrMpiReport,
          specInstrProcessGraph: !!c.specInstrProcessGraph,
          deliveryDate:         c.deliveryDate ? c.deliveryDate.slice(0,10) : '',
          specialRequirements:  c.specialRequirements  || '',
          precautions:          c.precautions          || '',
          catNormal:            !!c.catNormal,
          catCrackRisk:         !!c.catCrackRisk,
          catDistortionRisk:    !!c.catDistortionRisk,
          catCriticalFinishing: !!c.catCriticalFinishing,
          catDentDamage:        !!c.catDentDamage,
          catCavity:            !!c.catCavity,
          catOthers:            !!c.catOthers,
          procStressRelieving:  !!c.procStressRelieving,
          procHardening:        !!c.procHardening,
          procTempering:        !!c.procTempering,
          procAnnealing:        !!c.procAnnealing,
          procBrazing:          !!c.procBrazing,
          procPlasmaNitriding:  !!c.procPlasmaNitriding,
          procSubZero:          !!c.procSubZero,
          procSoakClean:        !!c.procSoakClean,
          visualBefore:         !!c.visualBefore,
          visualAfter:          c.visualAfter !== false ? true : false,
          mpiBefore:            !!c.mpiBefore,
          mpiAfter:             !!c.mpiAfter,
          mpiNil:               c.mpiNil !== false ? (!c.mpiAfter) : false,
          hardnessMin:          c.hardnessMin != null ? String(c.hardnessMin) : '',
          hardnessMax:          c.hardnessMax != null ? String(c.hardnessMax) : '',
          hardnessUnit:         c.hardnessUnit || 'HRC',
          achievedHardness:     c.achievedHardness != null ? String(c.achievedHardness) : '',
          hardnessAfter1:       c.hardnessAfter1 != null ? String(c.hardnessAfter1) : '',
          hardnessAfter2:       c.hardnessAfter2 != null ? String(c.hardnessAfter2) : '',
          hardnessAfter3:       c.hardnessAfter3 != null ? String(c.hardnessAfter3) : '',
          hardnessAfter4:       c.hardnessAfter4 != null ? String(c.hardnessAfter4) : '',
          distortionBefore:     extractDistLocal(c.distortionBefore),
          distortionAfter:      extractDistLocal(c.distortionAfter),
          packedQty:            c.packedQty  != null ? String(c.packedQty) : '',
          packedBy:             c.packedBy   || '',
          approvedBy:           c.approvedBy || '',
          finalInspectionBy:    c.finalInspectionBy || '',
          issuedTo:             c.issuedTo   || '',
          heatNo:               c.heatNo     || '',
          dispatchByOurVehicle: !!(c.dispatchedThrough || '').toLowerCase().includes('vehicle'),
          dispatchByCourier:    !!(c.dispatchedThrough || '').toLowerCase().includes('courier'),
          collectedByCustomer:  !!(c.dispatchedThrough || '').toLowerCase().includes('collected'),
          dispatchChallanNo:    c.dispatchChallanNo  || '',
          dispatchChallanDate:  c.dispatchChallanDate ? c.dispatchChallanDate.slice(0,10) : '',
          dispatchedThrough:    c.dispatchedThrough  || '',
          specialInstruction:   '',
        });
        if (c.items?.length) {
          // The certificate is issued against a job card, so the job card's
          // weight is what it shows — including a weight corrected after this
          // certificate was saved. The saved value stands in only when the job
          // card has no weight of its own. Print applies the same order.
          const jcData = c.jobCard || {};
          const chItems = (jcData.challanItemLinks || []).length
            ? jcData.challanItemLinks
            : (jcData.challans || []).flatMap(x => x.items || []);
          const chById = {};
          chItems.forEach(ci => { chById[ci.id] = ci; });
          const jcTotal = Number(jcData.totalWeight) || 0;
          const chSum = chItems.reduce((sum, ci) => sum + (Number(ci.weight) || 0), 0);
          const jcWeightFor = (it, i) => {
            const ch = (it.sourceChallanItemId && chById[it.sourceChallanItemId]) || chItems[i];
            const own = Number(ch?.weight) || 0;
            if (jcTotal > 0) {
              if (chSum > 0) return (own / chSum) * jcTotal;
              return c.items.length ? jcTotal / c.items.length : 0;
            }
            return own;
          };

          setCertItems(c.items.map((it, i) => {
            const qty = Math.max(Number(it.quantity) || 1, 1);
            const fromJc = jcWeightFor(it, i);
            const total = fromJc > 0 ? fromJc : (it.totalWeight != null ? Number(it.totalWeight) : 0);
            return {
              description:  it.description  || '',
              quantity:     it.quantity != null ? String(it.quantity) : '1',
              weightPerPc:  total > 0 ? String(Number((total / qty).toFixed(3)))
                                      : (it.weightPerPc != null ? String(it.weightPerPc) : ''),
              totalWeight:  total > 0 ? String(Number(total.toFixed(3))) : '',
              samplingPlan: it.samplingPlan || '',
              remarks:      it.remarks      || '',
            };
          }));
        }
        const rawTemp = c.tempCycleData;
        const parsedTemp = rawTemp ? (typeof rawTemp === 'string' ? JSON.parse(rawTemp) : rawTemp) : null;
        if (parsedTemp?.length) {
          setTempRows(parsedTemp.map(p => ({ time: String(p.time ?? ''), temp: String(p.temp ?? '') })));
          tempRowsUserEdited.current = true; // treat loaded cert data as "user owned" — don't overwrite
        }
        // Restore the previously-selected graph so the dropdown stays selected on re-edit
        if (c.tempCycleTemplateId != null) {
          setSelectedGraphId(String(c.tempCycleTemplateId));
        }
        // Load existing uploaded images so the photo slots show them in edit mode
        const imgs = {};
        for (let n = 1; n <= 5; n++) {
          if (c[`image${n}`]) imgs[`image${n}`] = c[`image${n}`];
        }
        setExistingImages(imgs);
      })
      .catch(() => toast.error('Failed to load certificate.'))
      .finally(() => setLoadingCert(false));
  }, [editId]); // eslint-disable-line

  // When jobCards load and we have a ?jobCardNo= param, set the resolved ID
  useEffect(() => {
    if (resolvedJobCardId && !form.jobCardId) {
      setForm(p => ({ ...p, jobCardId: resolvedJobCardId }));
    }
  }, [resolvedJobCardId]); // eslint-disable-line

  useEffect(() => {
    if (!form.jobCardId) {
      setJcData(null);
      return;
    }
    let cancelled = false;

    api.get(`/jobcards/${form.jobCardId}`).then(r => {
      if (cancelled) return;
      const jc = r.data.data;
      setJcData(jc);
      const imgs = {};
      for (let n = 1; n <= 5; n++) { if (jc[`image${n}`]) imgs[`image${n}`] = jc[`image${n}`]; }
      setJcImages(imgs);

      // Parse "58-60 HRC" → ["58","60"] — strip non-numeric suffix from each part
      const hrcMatch = (jc.hrcRange || '').match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
      const hardnessMin = hrcMatch ? hrcMatch[1] : (jc.hrcRange ? jc.hrcRange.split(/[–\-]/)[0]?.replace(/[^\d.]/g, '').trim() : '');
      const hardnessMax = hrcMatch ? hrcMatch[2] : (jc.hrcRange ? jc.hrcRange.split(/[–\-]/)[1]?.replace(/[^\d.]/g, '').trim() : '');
      const heatTreatment = jc.operationMode || 'HARDEN AND TEMPER';
      const insp = jc.inspection || {};

      // Build cert items from linked challan items
      const linkedItems = (jc.challanItemLinks || []).length > 0
        ? jc.challanItemLinks
        : (jc.challans?.flatMap(ch => ch.items || []) || []);
      if (linkedItems.length > 0) {
        // The job card's weight is what this certificate is for — a job card may
        // take only part of an inward, and the operator may correct the weight
        // there. So when the job card carries a total, that total wins and is
        // spread over the items (in proportion to their own weights when they
        // have any, equally otherwise) so the certificate adds up to it.
        // Item weights are used as-is only when the job card has no total.
        const jcTotalWt = Number(jc.totalWeight) || 0;
        const itemWtSum = linkedItems.reduce((sum, it) => sum + (Number(it.weight) || 0), 0);
        const weightFor = (it) => {
          const own = Number(it.weight) || 0;
          if (!(jcTotalWt > 0)) return own;
          if (itemWtSum > 0) return (own / itemWtSum) * jcTotalWt;
          return jcTotalWt / linkedItems.length;
        };
        setCertItems(linkedItems.map(it => {
          const qty = Math.max(Number(it.qty ?? it.quantity ?? 1), 1);
          return {
            description: (() => {
              let d = it.partName || it.description || '';
              const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              if (it.processName) d = d.replace(new RegExp('\\s*[-–]\\s*' + esc(it.processName) + '\\s*$', 'i'), '').trim();
              if (it.material)    d = d.replace(new RegExp('\\s*[-–]\\s*' + esc(it.material)    + '\\s*$', 'i'), '').trim();
              return d;
            })(),
            quantity:    String(qty),
            // The challan item carries the weight, and the job card's total is
            // already split per item above — both were computed and then
            // thrown away, so every certificate came out with a blank weight.
            ...(() => {
              const wt = weightFor(it);
              if (!(wt > 0)) return { weightPerPc: '', totalWeight: '' };
              return {
                weightPerPc: String(Number((wt / qty).toFixed(3))),
                totalWeight: String(Number(wt.toFixed(3))),
              };
            })(),
            samplingPlan: '',
            remarks: '',
          };
        }));
      }

      // challanItemLinks reflects each item's actual current challan assignment;
      // jc.challans[0] is a direct relation that can point to a stale/wrong
      // challan (e.g. an auto-created placeholder), so it must be checked last.
      const inwardChallanNo = jc.challanItemLinks?.[0]?.challan?.challanNo
        || jc.challans?.[0]?.challanNo
        || '';

      setForm(p => ({
        ...p,
        customerId:   jc.customerId   ? String(jc.customerId) : p.customerId,
        issuedTo:     jc.customerNameSnapshot || jc.customer?.name || p.issuedTo,
        yourPoNo:     jc.yourNo       || p.yourPoNo,
        yourRefNo:    inwardChallanNo || p.yourRefNo,
        heatNo:       jc.heatNo       || p.heatNo,
        dieMaterial:  jc.dieMaterial  || p.dieMaterial || 'D2',
        operatorMode: heatTreatment,
        hardnessMin:      hardnessMin || insp.requiredHardnessMin || p.hardnessMin,
        hardnessMax:      hardnessMax || insp.requiredHardnessMax || p.hardnessMax,
        hardnessUnit:     insp.hardnessUnit     || p.hardnessUnit,
        achievedHardness: insp.achievedHardness != null ? String(insp.achievedHardness) : p.achievedHardness,
        hardnessAfter1:   insp.hardnessAfter1   != null ? String(insp.hardnessAfter1)   : p.hardnessAfter1,
        hardnessAfter2:   insp.hardnessAfter2   != null ? String(insp.hardnessAfter2)   : p.hardnessAfter2,
        hardnessAfter3:   insp.hardnessAfter3   != null ? String(insp.hardnessAfter3)   : p.hardnessAfter3,
        hardnessAfter4:   insp.hardnessAfter4   != null ? String(insp.hardnessAfter4)   : p.hardnessAfter4,
        specialRequirements: jc.specialRequirements || p.specialRequirements,
        precautions:         jc.precautions         || p.precautions,
        specInstrCertificate:  jc.specInstrCert   ?? p.specInstrCertificate,
        specInstrMpiReport:    jc.specInstrMPIRep ?? p.specInstrMpiReport,
        specInstrProcessGraph: jc.specInstrGraph  ?? p.specInstrProcessGraph,
        dispatchByOurVehicle: !!jc.dispatchByOurVehicle,
        dispatchByCourier:    !!jc.dispatchByCourier,
        collectedByCustomer:  !!jc.collectedByCustomer,
        // Categorization / Process / Visual-MPI: the Job Card's Incoming
        // Inspection is the source of truth for these — always sync them in
        // from the job card's current inspection, for both a new AND an
        // existing certificate, so checking something in the Job Card shows
        // up on the certificate too. Editing them directly on the
        // certificate still works and pushes back to the job card on save
        // (see handleSubmit / syncCategorizationToJobCard on the backend) —
        // so both directions stay in sync.
        catNormal:            !!insp.catNormal,
        catWelded:            !!insp.catWelded,
        catCrackRisk:         !!insp.catCrackRisk,
        catDistortionRisk:    !!insp.catDistortionRisk,
        catCriticalFinishing: !!insp.catCriticalFinishing,
        catDentDamage:        !!insp.catDentDamage,
        catRusty:             !!insp.catRusty,
        catOthers:            !!insp.catOthers,
        procStressRelieving:  !!insp.procStressRelieving,
        procHardening:        !!insp.procHardening,
        procTempering:        !!insp.procTempering,
        procAnnealing:        !!insp.procAnnealing,
        procBrazing:          !!insp.procBrazing,
        procPlasmaNitriding:  !!insp.procPlasmaNitriding,
        procSubZero:          !!insp.procSubZero,
        procSoakClean:        !!insp.procSoakClean,
        visualBefore:         !!insp.visualBefore,
        visualAfter:          insp.visualAfter !== false,
        mpiBefore:            !!insp.mpiBefore,
        mpiAfter:             !!insp.mpiAfter,
        mpiNil:               insp.mpiNil !== false && !insp.mpiAfter,
        // Distortion Measurements are per-certificate physical readings, not
        // part of the job card's inspection classification — only seed them
        // from the job card when creating a brand-new certificate, so an
        // existing certificate's own saved measurements are never clobbered
        // by reopening the edit form (this was the original bug report).
        ...(!isEdit ? {
          distortionBefore: extractDist(insp.distortionBefore),
          distortionAfter:  extractDist(insp.distortionAfter),
        } : {}),
      }));

      if (!tempRowsUserEdited.current) {
        loadTempCycleFromRunsheet(form.jobCardId).then(ok => {
          if (!ok) updateTemperatureCycle(heatTreatment);
        });
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [form.jobCardId]);

  // New certificate only: auto-load the Temperature Cycle Graph flagged
  // isDefault, without requiring the user to select anything. Never runs in
  // edit mode — an existing certificate always keeps its own saved
  // tempCycleData (loaded separately below) regardless of what the default
  // graph is now. Graph `data` is segments [{tempC,holdMin,label}]; the
  // certificate's own editable table works in flat {time,temp} rows, so it's
  // converted once on load via segmentsToTempCycleData — same conversion the
  // hardcoded material presets already use.
  useEffect(() => {
    api.get('/quality/temp-cycle-templates', { params: { isActive: 'true', limit: 200 } })
      .then(r => setMasterGraphs(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    api.get('/quality/temp-cycle-templates/default')
      .then(r => {
        const tpl = r.data.data;
        if (tpl?.data?.length) {
          setTempRows(segmentsToTempCycleData(tpl.data).map(p => ({ time: String(p.time ?? ''), temp: String(p.temp ?? '') })));
          setSelectedGraphId(String(tpl.id));
          setNoDefaultTemplate(false);
        } else {
          setNoDefaultTemplate(true);
        }
      })
      .catch(() => setNoDefaultTemplate(true));
  }, [isEdit]);

  const selectGraph = async (graphId) => {
    if (!graphId) return;
    try {
      const r = await api.get(`/quality/temp-cycle-templates/${graphId}`);
      const graph = r.data.data;
      if (graph?.data?.length) {
        setTempRows(segmentsToTempCycleData(graph.data).map(p => ({ time: String(p.time ?? ''), temp: String(p.temp ?? '') })));
        setSelectedGraphId(String(graphId));
        setNoDefaultTemplate(false);
        toast.success(`Loaded graph: ${graph.name}`);
      }
    } catch {
      toast.error('Failed to load graph.');
    }
  };

  // Fetch pending cert items whenever jobCardId changes (create mode only)
  useEffect(() => {
    if (!form.jobCardId || isEdit) {
      setPendingCertItems([]);
      setCertifiedItems([]);
      setSelectedItemIds(new Set());
      return;
    }
    setLoadingCertItems(true);
    api.get(`/quality/certificates/pending-cert-items/${form.jobCardId}`)
      .then(r => {
        setPendingCertItems(r.data.data.pendingItems || []);
        setCertifiedItems(r.data.data.certifiedItems || []);
        // Auto-select all pending items by default
        setSelectedItemIds(new Set((r.data.data.pendingItems || []).map(it => it.id)));
      })
      .catch(() => {})
      .finally(() => setLoadingCertItems(false));
  }, [form.jobCardId, isEdit]);

  // When selected items change, auto-fill certItems table
  const prevSelectedRef = useRef(new Set());
  useEffect(() => {
    if (!pendingCertItems.length) return;
    const selected = pendingCertItems.filter(it => selectedItemIds.has(it.id));
    if (selected.length === 0) return;
    setCertItems(selected.map(it => {
      const qty = Math.max(Number(it.quantity) || 1, 1);
      const wt  = Number(it.weight) || 0;
      return {
        description:  it.description || it.processName || '',
        quantity:     String(qty),
        // Carry the inward's weight across — it was being dropped here too.
        weightPerPc:  wt > 0 ? String(Number((wt / qty).toFixed(3))) : '',
        totalWeight:  wt > 0 ? String(Number(wt.toFixed(3))) : '',
        samplingPlan: '',
        remarks:      '',
        sourceChallanItemId: it.id,
      };
    }));
    prevSelectedRef.current = selectedItemIds;
  }, [selectedItemIds]); // eslint-disable-line

  // null = user ne slot khali kiya. Sirf state me null rakhne se backend ko
  // pata hi nahi chalta tha (submit sirf File bhejta hai), isliye purani photo
  // DB me padi rehti thi aur print me aati rehti thi.
  const handleImageChange = (i, file) => {
    setImages(p => ({ ...p, [i]: file }));
    setRemovedImages(prev => {
      const next = new Set(prev);
      if (file) next.delete(i); else next.add(i);
      return next;
    });
    if (!file) {
      // saved URL bhi hata do, warna slot dobara bhar jayega
      setExistingImages(p => { const n = { ...p }; delete n[`image${i}`]; return n; });
      setJcImages(p => { const n = { ...p }; delete n[`image${i}`]; return n; });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!isEdit && !form.jobCardId) errs.jobCardId = 'Select the job card this certificate is for.';
    if (!form.customerId) errs.customerId = 'Customer is required — it fills in from the job card.';
    setCertErrors(errs);
    if (Object.keys(errs).length) {
      wiz.goto(0);
      toast.error('Please fix the highlighted fields on step 1.');
      return;
    }

    setLoading(true);
    try {
      const dispatchParts = [];
      if (form.dispatchByOurVehicle) dispatchParts.push('By Our Vehicle');
      if (form.dispatchByCourier)    dispatchParts.push('By Courier');
      if (form.collectedByCustomer)  dispatchParts.push('Collected by Customer');
      const submitForm = { ...form, dispatchedThrough: dispatchParts.join(', ') || form.dispatchedThrough };

      const fd = new FormData();
      Object.entries(submitForm).forEach(([k, v]) => {
        if (k === 'distortionBefore' || k === 'distortionAfter') {
          // Keep raw values so text entries like "NA"/"OK" survive; numbers stay numeric.
          fd.append(k, JSON.stringify(v.map((val, i) => {
            const s = val == null ? '' : String(val).trim();
            const num = Number(s);
            return { pt: i + 1, val: s !== '' && !isNaN(num) ? num : s };
          })));
        } else {
          fd.append(k, v);
        }
      });
      fd.append('items', JSON.stringify(certItems.filter(it => it.description?.trim())));
      if (!isEdit && selectedItemIds.size > 0) {
        fd.append('selectedChallanItemIds', JSON.stringify([...selectedItemIds]));
      }
      fd.append('tempCycleData', JSON.stringify(tempRows));
      if (selectedGraphId) fd.append('tempCycleTemplateId', selectedGraphId);
      for (let i = 1; i <= 5; i++) { if (images[i] instanceof File) fd.append(`image${i}`, images[i]); }
      if (removedImages.size) fd.append('removeImages', [...removedImages].join(','));

      if (isEdit) {
        await api.put(`/quality/certificates/${editId}`, fd);
        toast.success('Certificate updated!');
      } else {
        const r = await api.post('/quality/certificates', fd);
        toast.success(`Certificate ${r.data.data.certNo} created!`);
      }
      navigate('/quality/certificates');
    } catch (err) {
      toast.error(err.response?.data?.message || (isEdit ? 'Error updating certificate.' : 'Error creating certificate.'));
    } finally { setLoading(false); }
  };

  if (loadingCert) return <div className="p-10 text-slate-400 text-sm">Loading certificate…</div>;

  const jcNo = jcData?.jobCardNo || '';
  const totalCertQty = certItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const totalCertWt = certItems.reduce((s, it) => s + (Number(it.totalWeight) || 0), 0);
  const goNext = () => { if (wiz.current < LAST_STEP) wiz.next(); };

  return (
    <div className="font-app flex flex-col h-full min-h-0">
      <PageHeader
        title={isEdit ? 'Edit Test Certificate' : 'Create Test Certificate'}
        backTo="/quality/certificates"
        breadcrumbs={[
          { label: 'Certificates', to: '/quality/certificates' },
          { label: isEdit ? (form.issueNo || 'Edit') : 'New' },
        ]}
        meta={
          <>
            {form.issueNo && <span className="font-app-mono">Cert {form.issueNo}</span>}
            {jcNo && (
              <span>
                Job Card{' '}
                {form.jobCardId
                  ? <Link to={`/jobcards/${form.jobCardId}`} className="font-app-mono font-semibold text-sky-700 hover:underline">{jcNo}</Link>
                  : <span className="font-app-mono font-semibold text-slate-700">{jcNo}</span>}
              </span>
            )}
          </>
        }
      />

      <div className="mt-2 shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-card">
        <Stepper
          steps={CERT_STEPS}
          current={wiz.current}
          completed={wiz.completed}
          onStepClick={(i) => wiz.goto(i)}
        />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (wiz.current === LAST_STEP) handleSubmit(e); }}
        className="flex-1 min-h-0 flex flex-col"
      >
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 pr-0.5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Step {wiz.current + 1} of {CERT_STEPS.length} · {CERT_STEPS[wiz.current].full}
        </p>

        {/* ── Step 1 · Job card & customer ── */}
        <div hidden={wiz.current !== 0} className="space-y-4">
          <FormErrorSummary
            errors={Object.fromEntries(Object.entries(certErrors).map(([k, v]) => [k, { message: v }]))}
            labels={{ jobCardId: 'Job card', customerId: 'Customer' }}
          />
          <CertHeaderSection form={form} set={set} parties={parties} jobCards={jobCards} jcData={jcData} />
        </div>

        {/* ── Step 2 · Items ── */}
        <div hidden={wiz.current !== 1} className="space-y-4">
          {!isEdit && form.jobCardId && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 gap-3">
                <div className="space-y-1 min-w-0">
                  <CardTitle>Select Items to Certify</CardTitle>
                </div>
                {pendingCertItems.length > 0 && (
                  <Button type="button" variant="link" size="sm" className="shrink-0"
                    onClick={() => setSelectedItemIds(
                      selectedItemIds.size === pendingCertItems.length
                        ? new Set()
                        : new Set(pendingCertItems.map(it => it.id))
                    )}>
                    {selectedItemIds.size === pendingCertItems.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
              {loadingCertItems ? (
                <p className="text-xs text-slate-400 py-1">Loading items…</p>
              ) : pendingCertItems.length === 0 && certifiedItems.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">No items linked to this Job Card.</p>
              ) : (
                <div className="space-y-1.5">
                  {pendingCertItems.map(it => {
                    const checked = selectedItemIds.has(it.id);
                    return (
                      <div key={it.id}
                        onClick={() => setSelectedItemIds(prev => {
                          const next = new Set(prev);
                          if (next.has(it.id)) next.delete(it.id); else next.add(it.id);
                          return next;
                        })}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors
                          ${checked
                            ? 'bg-sky-50 border-sky-300 border-l-4 border-l-sky-500'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        <input type="checkbox" checked={checked} readOnly
                          className="w-3.5 h-3.5 accent-sky-600 cursor-pointer flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-slate-800 truncate block">
                            {it.description || it.processName || '—'}
                          </span>
                          {it.material && <span className="text-[10px] text-slate-500">{it.material}</span>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0 tabular-nums">
                          <span>Qty: <span className="font-bold text-slate-700">{Number(it.quantity)}</span></span>
                          {it.weight && <span>Wt: <span className="font-bold text-amber-700">{Number(it.weight).toFixed(3)} kg</span></span>}
                          <Badge variant="warning" className="text-[10px]">Pending Cert</Badge>
                        </div>
                      </div>
                    );
                  })}

                  {certifiedItems.map(it => (
                    <div key={it.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed">
                      <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" strokeWidth={3} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-slate-600 truncate block">
                          {it.description || it.processName || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-shrink-0">
                        <Badge variant="success" className="text-[10px]">
                          Certified {it.certItems?.[0]?.cert?.certNo ? `→ ${it.certItems[0].cert.certNo}` : ''}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {selectedItemIds.size > 0 && (
                    <div className="mt-2 px-3 py-2 bg-sky-50 rounded-lg text-xs text-sky-700 font-medium">
                      {selectedItemIds.size} item{selectedItemIds.size > 1 ? 's' : ''} selected for this certificate
                    </div>
                  )}
                </div>
              )}
              </CardContent>
            </Card>
          )}
          <CertItemsTable certItems={certItems} setCertItems={setCertItems} />
        </div>

        {/* ── Step 3 · Technical & categorization ── */}
        <div hidden={wiz.current !== 2} className="space-y-4">
          <CertTechnicalSection form={form} set={set} updateTemperatureCycle={updateTemperatureCycle} jcData={jcData} />
          {form.jobCardId && (
            <div className="flex items-start gap-2 rounded-lg border border-info-200 bg-info-50 px-3 py-2 text-xs text-info-800">
              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Synced with Job Card {jcNo || ''}.</strong> Categorization, process, visual and MPI below
                mirror its incoming inspection — editing them here also updates the job card on save.
              </span>
            </div>
          )}
          <CertCategorizationSection form={form} set={set} jcData={jcData} />
        </div>

        {/* ── Step 4 · Hardness & distortion ── */}
        <div hidden={wiz.current !== 3} className="space-y-4">
          <CertHardnessSection form={form} set={set} jcData={jcData} />
          <DistortionTable form={form} setForm={setForm} set={set} />
        </div>

        {/* ── Step 5 · Temperature cycle ── */}
        <div hidden={wiz.current !== 4} className="space-y-4">
          <TemperatureCurve
            tempRows={tempRows}
            setTempRows={(rows) => { tempRowsUserEdited.current = true; setTempRows(rows); }}
            form={form}
            masterGraphs={masterGraphs}
            selectGraph={(id) => { tempRowsUserEdited.current = false; return selectGraph(id); }}
            selectedGraphId={selectedGraphId}
            noDefaultTemplate={!isEdit && noDefaultTemplate}
          />
        </div>

        {/* ── Step 6 · Packing & photos ── */}
        <div hidden={wiz.current !== 5} className="space-y-4">
          <CertPackingSection form={form} set={set} jcData={jcData} />
          <CertPhotosSection handleImageChange={handleImageChange} existingImages={{ ...jcImages, ...existingImages }} />
        </div>

        {/* ── Step 7 · Review & save ── */}
        <div hidden={wiz.current !== 6} className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Review — nothing is saved until you press “{isEdit ? 'Update' : 'Create'} Certificate”</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Certificate no</dt><dd className="mt-0.5 font-app-mono text-slate-800">{form.issueNo || '—'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issue date</dt><dd className="mt-0.5 text-slate-800">{form.issueDate || '—'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job card</dt><dd className="mt-0.5 font-app-mono text-slate-800">{jcNo || '—'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</dt><dd className="mt-0.5 text-slate-800">{form.issuedTo || parties.find(p => String(p.id) === String(form.customerId))?.name || '—'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</dt><dd className="mt-0.5 text-slate-800">{certItems.filter(it => it.description?.trim()).length} · qty {totalCertQty} · {totalCertWt ? totalCertWt.toFixed(3) : '0'} kg</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hardness</dt><dd className="mt-0.5 font-app-mono text-slate-800">{[form.hardnessMin, form.hardnessMax].filter(Boolean).join('–') || '—'} {form.hardnessUnit} {form.achievedHardness ? `→ ${form.achievedHardness}` : ''}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Temperature cycle</dt><dd className="mt-0.5 text-slate-800">{tempRows.filter(r => r.time !== '' || r.temp !== '').length} points</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Packed qty</dt><dd className="mt-0.5 text-slate-800">{form.packedQty || '—'}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dispatch</dt><dd className="mt-0.5 text-slate-800">{[form.dispatchByOurVehicle && 'Our vehicle', form.dispatchByCourier && 'Courier', form.collectedByCustomer && 'Collected'].filter(Boolean).join(', ') || '—'}</dd></div>
              </dl>
            </CardContent>
          </Card>
        </div>

        </div>

        {/* ── Wizard navigation ── */}
        <div className="shrink-0 mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-card sm:px-5">
          <Button type="button" variant="ghost" disabled={wiz.isFirst} onClick={wiz.back}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <span className="font-app-mono text-xs text-slate-400">Step {wiz.current + 1} of {CERT_STEPS.length}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/quality/certificates">Cancel</Link></Button>
            {wiz.current < LAST_STEP ? (
              <Button type="button" onClick={goNext}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} loading={loading} disabled={loading}>
                {loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Update Certificate' : 'Create Certificate')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
