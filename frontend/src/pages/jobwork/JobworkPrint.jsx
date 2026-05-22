import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';

function SvtLogo({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,2 95,27 95,77 50,102 5,77 5,27" fill="#1a1a1a" stroke="#000" strokeWidth="1.5"/>
      <path d="M 38,28 C 22,28 20,38 30,43 L 40,48 C 54,53 54,65 38,66 C 28,66 24,62 24,62"
        fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"/>
      <text x="60" y="70" textAnchor="middle" fill="white"
        fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="28" letterSpacing="1">VT</text>
      <text x="50" y="96" textAnchor="middle" fill="#aaa"
        fontFamily="Arial, sans-serif" fontSize="6" letterSpacing="0.5">PUNE</text>
    </svg>
  );
}

function TuvLogo({ size = 52 }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 72 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="70" height="50" rx="4" fill="white" stroke="#1e3a8a" strokeWidth="2" />
      <text x="36" y="20" textAnchor="middle" fill="#1e3a8a"
        fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" letterSpacing="1">TÜV</text>
      <text x="36" y="33" textAnchor="middle" fill="#1e3a8a"
        fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="9" letterSpacing="1">AUSTRIA</text>
      <text x="36" y="44" textAnchor="middle" fill="#64748b"
        fontFamily="Arial,sans-serif" fontSize="7">CERTIFIED</text>
    </svg>
  );
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');
const toN = (v) => Number(v) || 0;

export default function JobworkPrint() {
  const { id } = useParams();
  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/jobwork/${id}`)
      .then(r => setChallan(r.data.data))
      .catch(() => setError('Challan not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-slate-400">Loading...</div>;
  if (error || !challan) return (
    <div className="p-10 text-center">
      <p className="text-rose-500 font-bold">{error || 'Challan not found.'}</p>
      <Link to="/jobwork" className="text-indigo-600">← Back</Link>
    </div>
  );

  const items = challan.items || [];
  const monthYear = challan.challanDate
    ? new Date(challan.challanDate)
        .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        .toUpperCase()
    : '—';
  const materialInDate = challan.receivedDate || challan.challanDate;
  const invoiceNos = (challan.taxInvoices || []).map(i => i.invoiceNo).join(', ') || '—';
  const companyName = challan.fromParty?.name || '—';
  const jobcardNo = challan.jobCard?.jobCardNo || '—';
  const jobcardDate = challan.jobCard?.createdAt || null;

  const rows = items.map((it, idx) => ({
    srNo: idx + 1,
    material: it.material || '—',
    qty: toN(it.quantity),
    weight: toN(it.weight).toFixed(3),
  }));

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 0.5cm; size: A4 landscape; }
        }
        .reg-hdr { border-collapse: collapse; width: 100%; }
        .reg-hdr td { border: 1px solid #1e293b; }
        .reg-data { border-collapse: collapse; width: 100%; }
        .reg-data th, .reg-data td {
          border: 1px solid #374151;
          padding: 3px 4px;
          font-size: 8px;
          text-align: center;
          vertical-align: middle;
        }
        .reg-data th {
          background: #f1f5f9;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 7px;
          line-height: 1.2;
        }
        .reg-data td { font-size: 8px; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print max-w-[1200px] mx-auto mb-4 flex items-center justify-between px-4">
        <Link to={`/jobwork/${id}`} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to Detail
        </Link>
        <button onClick={() => window.print()} className="btn-primary">
          <span className="material-symbols-outlined text-[20px]">print</span>
          Print Register
        </button>
      </div>

      {/* Page */}
      <div className="page max-w-[1200px] mx-auto bg-white shadow-xl border border-slate-200 p-3 print:shadow-none print:border-0 print:p-2">

        {/* ── REGISTER HEADER TABLE ── */}
        <table className="reg-hdr mb-0">
          <tbody>
            <tr>
              {/* SVT Logo */}
              <td rowSpan={4} style={{width:'80px', textAlign:'center', padding:'6px'}}>
                <SvtLogo size={64} />
              </td>
              {/* Company name + title: spans middle 2 cols, 4 rows */}
              <td colSpan={2} rowSpan={4} style={{textAlign:'center', padding:'8px', verticalAlign:'middle'}}>
                <div style={{fontWeight:900, fontSize:'15px', letterSpacing:'1px', color:'#0f172a'}}>
                  SHITAL VACUUM TREAT PVT.LTD.
                </div>
                <div style={{fontWeight:700, fontSize:'11px', color:'#475569', marginTop:'4px'}}>
                  TITLE:- INWARD/OUTWARD REGISTER
                </div>
              </td>
              {/* Doc control labels */}
              <td style={{padding:'4px 8px', fontSize:'9px', fontWeight:700, color:'#475569', textTransform:'uppercase', whiteSpace:'nowrap'}}>DOC NO</td>
              <td style={{padding:'4px 8px', fontSize:'9px', fontFamily:'monospace', fontWeight:900, color:'#0f172a'}}>QF-ST-01</td>
              {/* TÜV Logo */}
              <td rowSpan={4} style={{width:'90px', textAlign:'center', padding:'6px'}}>
                <TuvLogo size={52} />
              </td>
            </tr>
            <tr>
              <td style={{padding:'4px 8px', fontSize:'9px', fontWeight:700, color:'#475569', textTransform:'uppercase', whiteSpace:'nowrap'}}>REVISION NO</td>
              <td style={{padding:'4px 8px', fontSize:'9px', fontFamily:'monospace', fontWeight:900, color:'#0f172a'}}>0</td>
            </tr>
            <tr>
              <td style={{padding:'4px 8px', fontSize:'9px', fontWeight:700, color:'#475569', textTransform:'uppercase', whiteSpace:'nowrap'}}>REV. DATE</td>
              <td style={{padding:'4px 8px'}}></td>
            </tr>
            <tr>
              <td style={{padding:'4px 8px', fontSize:'9px', fontWeight:700, color:'#475569', textTransform:'uppercase', whiteSpace:'nowrap'}}>PAGE NO</td>
              <td style={{padding:'4px 8px', fontSize:'9px', fontFamily:'monospace', fontWeight:900, color:'#0f172a'}}>1 Of 1</td>
            </tr>
            {/* Month subtitle row */}
            <tr>
              <td colSpan={6} style={{
                borderTop:'1px solid #1e293b',
                padding:'5px 12px',
                textAlign:'center',
                fontSize:'11px',
                fontWeight:900,
                letterSpacing:'1px',
                color:'#0f172a',
                textTransform:'uppercase',
              }}>
                FOR THE MONTH OF :- {monthYear}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── DATA TABLE ── */}
        <table className="reg-data">
          <thead>
            <tr>
              <th style={{width:'4%'}}>SR<br/>NO</th>
              <th style={{width:'14%'}}>COMPANY NAME</th>
              <th style={{width:'10%'}}>MATERIAL</th>
              <th style={{width:'12%'}}>CHALLAN NO</th>
              <th style={{width:'9%'}}>CHALLAN<br/>DATE</th>
              <th style={{width:'9%'}}>MATERIAL<br/>IN DATE</th>
              <th style={{width:'5%'}}>QTY</th>
              <th style={{width:'8%'}}>WEIGHT</th>
              <th style={{width:'12%'}}>JOBCARD NO</th>
              <th style={{width:'9%'}}>JOBCARD<br/>DATE</th>
              <th style={{width:'8%'}}>INVOICE</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} style={{padding:'16px', color:'#94a3b8'}}>No items.</td>
              </tr>
            ) : rows.map(r => (
              <tr key={r.srNo}>
                <td>{r.srNo}</td>
                <td style={{textAlign:'left', fontWeight:700}}>{companyName}</td>
                <td>{r.material}</td>
                <td style={{fontFamily:'monospace', fontSize:'7px'}}>{challan.challanNo}</td>
                <td>{fmtDate(challan.challanDate)}</td>
                <td>{fmtDate(materialInDate)}</td>
                <td style={{fontWeight:700}}>{r.qty}</td>
                <td style={{fontFamily:'monospace'}}>{r.weight}</td>
                <td style={{fontFamily:'monospace', fontSize:'7px'}}>{jobcardNo}</td>
                <td>{fmtDate(jobcardDate)}</td>
                <td style={{fontFamily:'monospace', fontSize:'7px'}}>{invoiceNos}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Screen-only footer */}
        <div className="no-print flex justify-between items-center mt-3 px-1">
          <p className="text-[9px] text-slate-400 uppercase font-bold">Computer Generated · SVT ERP</p>
          <p className="text-[9px] text-slate-400 uppercase font-mono">
            Printed: {new Date().toLocaleDateString('en-IN')}
          </p>
        </div>
      </div>
    </div>
  );
}
