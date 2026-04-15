import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatDate, formatCurrency } from '../../utils/formatters';

const COMPANY = {
  name: 'SHITAL VACUUM TREAT PVT. LTD.',
  gstin: '27AATCS0577L1ZK',
  address: 'Plot No. 84/1, Sector No. 10, PCNTDA, Bhosari, Pune – 411026',
  phone: '02027484640',
  email: 'info@shitalvacuumtreat.com',
};

function numToWords(n) {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const num = Math.round(n);
  if (num === 0) return 'Zero';
  if (num < 20) return a[num];
  if (num < 100) return b[Math.floor(num/10)] + (num%10 ? ' ' + a[num%10] : '');
  if (num < 1000) return a[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' ' + numToWords(num%100) : '');
  if (num < 100000) return numToWords(Math.floor(num/1000)) + ' Thousand' + (num%1000 ? ' ' + numToWords(num%1000) : '');
  if (num < 10000000) return numToWords(Math.floor(num/100000)) + ' Lakh' + (num%100000 ? ' ' + numToWords(num%100000) : '');
  return numToWords(Math.floor(num/10000000)) + ' Crore' + (num%10000000 ? ' ' + numToWords(num%10000000) : '');
}

export default function CustomerQuotePrint() {
  const { id } = useParams();
  const [q, setQ] = useState(null);

  useEffect(() => {
    api.get(`/customer-quotes/${id}`).then(r => {
      setQ(r.data.data);
      setTimeout(() => window.print(), 600);
    });
  }, [id]);

  if (!q) return <div style={{textAlign:'center',padding:40}}>Loading...</div>;

  const subtotal = +q.subtotal;
  const cgst = +q.cgst;
  const sgst = +q.sgst;
  const total = +q.totalAmount;
  const inWords = numToWords(Math.round(total)) + ' Rupees Only';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, maxWidth: 800, margin: '0 auto', padding: 20, color: '#111' }}>
      {/* Header */}
      <table style={{ width: '100%', borderBottom: '2px solid #1e3a5f', marginBottom: 8 }}>
        <tbody><tr>
          <td style={{ width: '60%' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#1e3a5f', letterSpacing: 1 }}>{COMPANY.name}</div>
            <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{COMPANY.address}</div>
            <div style={{ fontSize: 9, color: '#555' }}>Ph: {COMPANY.phone} | Email: {COMPANY.email}</div>
            <div style={{ fontSize: 9, color: '#555' }}>GSTIN: {COMPANY.gstin}</div>
          </td>
          <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1e3a5f', letterSpacing: 2, textTransform: 'uppercase' }}>QUOTATION</div>
          </td>
        </tr></tbody>
      </table>

      {/* Quote meta */}
      <table style={{ width: '100%', marginBottom: 10 }}>
        <tbody><tr>
          <td style={{ width: '55%', verticalAlign: 'top' }}>
            <div style={{ border: '1px solid #ccc', padding: 8, borderRadius: 4 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>To:</div>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{q.customer?.name}</div>
              {q.customer?.address && <div style={{ color: '#555', fontSize: 10 }}>{q.customer.address}</div>}
              {q.customer?.gstin && <div style={{ fontSize: 10 }}>GSTIN: <strong>{q.customer.gstin}</strong></div>}
            </div>
          </td>
          <td style={{ width: '45%', verticalAlign: 'top', paddingLeft: 12 }}>
            <table style={{ width: '100%', fontSize: 10 }}>
              <tbody>
                {[
                  ['Quote No.', q.quoteNo],
                  ['Date', formatDate(q.quoteDate)],
                  ['Valid Until', q.validUntil ? formatDate(q.validUntil) : '—'],
                  ['Status', q.status],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: '#555', paddingBottom: 3, width: 90 }}>{k}</td>
                    <td style={{ fontWeight: 700, paddingBottom: 3 }}>: {v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr></tbody>
      </table>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: '#fff' }}>
            {['#','Part Name','Process','Material','Qty','Weight (kg)','Rate (₹)','HSN','Amount (₹)'].map(h => (
              <th key={h} style={{ border: '1px solid #1e3a5f', padding: '5px 6px', fontSize: 9, fontWeight: 700, textAlign: 'center' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.items.map((item, i) => (
            <tr key={item.id} style={{ background: i%2===0?'#f8f9fa':'#fff' }}>
              <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'center' }}>{i+1}</td>
              <td style={{ border: '1px solid #ddd', padding: '4px 6px', fontWeight: 600 }}>{item.partName}</td>
              <td style={{ border: '1px solid #ddd', padding: '4px 6px' }}>{item.processType?.name || '—'}</td>
              <td style={{ border: '1px solid #ddd', padding: '4px 6px' }}>{item.material || '—'}</td>
              <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'center' }}>{item.qty}</td>
              <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right' }}>{item.weight ? +item.weight : '—'}</td>
              <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right' }}>₹{formatCurrency(item.rate)}</td>
              <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'center' }}>{item.hsnCode || '—'}</td>
              <td style={{ border: '1px solid #ddd', padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>₹{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <table style={{ width: '100%', marginBottom: 10 }}>
        <tbody><tr>
          <td style={{ verticalAlign: 'top', width: '55%' }}>
            {q.notes && <div style={{ border: '1px solid #ddd', padding: 8, borderRadius: 4, fontSize: 10, color: '#555' }}><strong>Notes:</strong> {q.notes}</div>}
            {q.paymentTerms && <div style={{ marginTop: 6, fontSize: 10, color: '#555' }}><strong>Payment Terms:</strong> {q.paymentTerms}</div>}
          </td>
          <td style={{ verticalAlign: 'top', paddingLeft: 20 }}>
            <table style={{ width: '100%', fontSize: 11 }}>
              <tbody>
                {[
                  ['Subtotal', `₹${formatCurrency(subtotal)}`],
                  [`CGST (${+q.cgstRate}%)`, `₹${formatCurrency(cgst)}`],
                  [`SGST (${+q.sgstRate}%)`, `₹${formatCurrency(sgst)}`],
                ].map(([k,v]) => (
                  <tr key={k}>
                    <td style={{ padding: '2px 0', color: '#555' }}>{k}</td>
                    <td style={{ padding: '2px 0', textAlign: 'right', fontFamily: 'monospace' }}>{v}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #1e3a5f' }}>
                  <td style={{ padding: '4px 0', fontWeight: 900, fontSize: 13 }}>Total</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 900, fontSize: 13, fontFamily: 'monospace' }}>₹{formatCurrency(total)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 9, color: '#555', marginTop: 4, fontStyle: 'italic' }}>
              {inWords}
            </div>
          </td>
        </tr></tbody>
      </table>

      {/* Terms */}
      <div style={{ fontSize: 9, color: '#555', borderTop: '1px solid #ddd', paddingTop: 6, marginBottom: 20 }}>
        <strong>Terms & Conditions:</strong>
        <ol style={{ paddingLeft: 16, margin: '4px 0 0' }}>
          <li>Prices are valid for the period mentioned above.</li>
          <li>GST as applicable will be charged extra.</li>
          <li>Delivery subject to availability of material and furnace schedule.</li>
        </ol>
      </div>

      {/* Signature */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 30 }}>
        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <div style={{ borderTop: '1px solid #555', paddingTop: 4, fontSize: 10 }}>
            <div style={{ fontWeight: 700 }}>For {COMPANY.name}</div>
            <div style={{ fontSize: 9, color: '#555', marginTop: 20 }}>Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
