import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate } from '../../utils/formatters';

const COMPANY = {
  name: 'SHITAL VACUUM TREAT PVT. LTD',
  addr1: 'PLOT NO:- 84/1, SECTOR NO-10,',
  addr2: 'PCNTDA, BHOSARI, PUNE-411019',
  website: 'www.shitalvacuumtreat.com',
  pan: 'AATCS0577L',
  gstin: '27AATCS0577L1ZK',
  servicesCode: '998873 ( 18% )',
  iso: 'ISO 9001 -2015',
};

function SvtLogo({ size = 88 }) {
  return <img src="/logo.png" alt="SVT" style={{ width: size, height: size, objectFit: 'contain' }} />;
}

const cell = { border: '1px solid #000', padding: '5px 8px', verticalAlign: 'middle' };

const UNIT_SUFFIX = { KGS: 'Per Kgs.', PCS: 'Per Pc.', LOT: 'Lot' };

export default function CustomerQuotePrint() {
  const { id } = useParams();
  const [q, setQ] = useState(null);

  useEffect(() => { const p = document.title; document.title = ' '; return () => { document.title = p; }; }, []);

  useEffect(() => {
    api.get(`/customer-quotes/${id}`).then(r => {
      setQ(r.data.data);
      setTimeout(() => window.print(), 600);
    });
  }, [id]);

  if (!q) return <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>;

  // Pad line items to a minimum of 5 rows like the paper form.
  const rows = [...q.items];
  while (rows.length < 5) rows.push(null);

  const TERMS = [
    ['TRANSPORT', q.termsTransport || 'BOTH SIDE AT YOUR END'],
    ['PAYMENT', q.termsPayment || '60 DAYS.'],
    ['DELIVERY', q.termsDelivery || '4-5 DAYS AFTER RECEPIT OF MATERIAL AT OUR END'],
    ['TAX', q.termsTax || 'AS PER GOVERMENT RULES'],
    ['', ''],
  ];

  const COMMERCIAL = [
    ['PAN CARD NO', q.commercialPan || COMPANY.pan],
    ['GST NO', q.commercialGst || COMPANY.gstin],
    ['SERVICES CODE', q.commercialServicesCode || COMPANY.servicesCode],
    ['ISO CERTIFICATE', q.commercialIso || COMPANY.iso],
    ['', ''],
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, maxWidth: 780, margin: '0 auto', padding: 16, color: '#000' }}>
      <style>{`@page { margin: 0mm; size: A4; } @media print { .no-print { display: none !important; } html, body { margin: 0 !important; padding: 6mm !important; } }`}</style>

      <div className="no-print" style={{ marginBottom: 12 }}>
        <Link to={`/customer-quotes/${id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#4338ca', textDecoration: 'none', fontWeight: 600 }}>
          ← Back
        </Link>
      </div>

      <div style={{ border: '2px solid #000' }}>
        {/* ── Header ─────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td rowSpan={3} style={{ ...cell, width: 150, textAlign: 'center', verticalAlign: 'middle' }}>
                <SvtLogo size={92} />
              </td>
              <td style={{ ...cell, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.5 }}>{COMPANY.name}</div>
              </td>
            </tr>
            <tr>
              <td style={{ ...cell, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{COMPANY.addr1}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{COMPANY.addr2}</div>
              </td>
            </tr>
            <tr>
              <td style={{ ...cell, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>TITLE :- QUOTATION.</td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', padding: '3px 0', color: '#1155cc', fontWeight: 700, fontSize: 12 }}>
          {COMPANY.website}
        </div>

        {/* ── Quotation No / Date ────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ ...cell, fontWeight: 700, width: '18%' }}>QUOTATION NO:-</td>
              <td style={{ ...cell, fontWeight: 700, width: '32%' }}>{q.quoteNo}</td>
              <td style={{ ...cell, fontWeight: 700, width: '12%' }}>DATE:-</td>
              <td style={{ ...cell, fontWeight: 700 }}>{formatDate(q.quoteDate)}</td>
            </tr>
          </tbody>
        </table>

        {/* ── To / M/S. ──────────────────────────────────── */}
        <div style={{ ...cell, borderTop: 'none', minHeight: 70 }}>
          <div style={{ fontWeight: 700 }}>TO,</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>M/S. {q.customer?.name || ''}</div>
          {q.customer?.address && <div style={{ marginTop: 2 }}>{q.customer.address}</div>}
          {q.customer?.gstin && <div style={{ marginTop: 2, fontSize: 11 }}>GSTIN: {q.customer.gstin}</div>}
        </div>

        {/* ── Kind Attn ──────────────────────────────────── */}
        <div style={{ ...cell, borderTop: '1px solid #000', fontWeight: 700 }}>
          KIND ATTN:- Mr. {q.kindAttn || ''}
        </div>

        {/* ── Item Table ─────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ fontWeight: 700, textAlign: 'center' }}>
              <td style={{ ...cell, width: '8%' }}>SR NO</td>
              <td style={{ ...cell, width: '28%' }}>DESCRIPTION</td>
              <td style={{ ...cell, width: '24%' }}>MATERIAL</td>
              <td style={{ ...cell, width: '22%' }}>PROCESS</td>
              <td style={{ ...cell, width: '18%' }}>RATE</td>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr key={i} style={{ height: 46 }}>
                <td style={{ ...cell, textAlign: 'center' }}>{item ? i + 1 : ''}</td>
                <td style={{ ...cell }}>{item ? item.partName : ''}</td>
                <td style={{ ...cell, textAlign: 'center' }}>{item ? (item.material || '') : ''}</td>
                <td style={{ ...cell, textAlign: 'center' }}>{item ? (item.processType?.name || '') : ''}</td>
                <td style={{ ...cell, textAlign: 'center', fontWeight: 700 }}>
                  {item && +item.rate > 0 ? `${(+item.rate).toFixed(0)}/- ${UNIT_SUFFIX[item.unit] || UNIT_SUFFIX.KGS}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Terms & Condition ──────────────────────────── */}
        <div style={{ ...cell, borderTop: '1px solid #000', fontWeight: 700 }}>TERMS & CONDITION :-</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {TERMS.map(([label, value], i) => (
              <tr key={i} style={{ height: 30 }}>
                <td style={{ ...cell, width: '8%', textAlign: 'center' }}>{label ? i + 1 : ''}</td>
                <td style={{ ...cell, width: '24%', fontWeight: 700 }}>{label}</td>
                <td style={{ ...cell }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Commercial Details ─────────────────────────── */}
        <div style={{ ...cell, borderTop: '1px solid #000', fontWeight: 700 }}>COMMERCIAL DETAILS:-</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {COMMERCIAL.map(([label, value], i) => (
              <tr key={i} style={{ height: 30 }}>
                <td style={{ ...cell, width: '8%', textAlign: 'center' }}>{label ? i + 1 : ''}</td>
                <td style={{ ...cell, width: '24%', fontWeight: 700 }}>{label}</td>
                <td style={{ ...cell }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Footer ─────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #000' }}>
          <tbody>
            <tr style={{ fontWeight: 700, fontSize: 11 }}>
              <td style={{ ...cell, border: 'none', width: '34%' }}>DOC. NO- QF-MKT-03</td>
              <td style={{ ...cell, border: 'none', width: '33%', textAlign: 'center' }}>REVISION NO: 00</td>
              <td style={{ ...cell, border: 'none', textAlign: 'right' }}>REVISION DATE: 01.04.2019</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
