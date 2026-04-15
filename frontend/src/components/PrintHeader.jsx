/**
 * Shared print header used on all printed documents:
 * Invoice, Certificate, Job Card, VHT Run Sheet, etc.
 *
 * Layout:  [SVT Logo]  [Document Title]  [TUV Logo]
 */

const COMPANY = {
  name:    'SHEETAL DIES & TOOLS PVT. LTD.',
  factory: 'OM Sai Industrial Premises Co.Op.Soc., Plot No. 84/2, Sector No. 10, PCNTDA, Bhosari, Pune – 411026',
  regdOfc: 'OM Sai Industrial Premises Co.Op.Soc., Plot No. 84/2, Sector No. 10, PCNTDA, Bhosari, Pune – 411026',
  email:   'info@sheetaldies.in',
  phone:   '09822012850',
  gstin:   '27AANCS2087B1ZA',
};

/** SVT company logo as inline SVG */
function SvtLogo({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="27" fill="#0f172a" stroke="#0f172a" strokeWidth="2" />
      <text x="28" y="35" textAnchor="middle" fill="white"
        fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="16" letterSpacing="1">
        SVT
      </text>
    </svg>
  );
}

/** TUV Austria logo as inline SVG */
function TuvLogo({ size = 52 }) {
  return (
    <svg width={size * 1.4} height={size} viewBox="0 0 72 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="70" height="50" rx="4" fill="white" stroke="#1e3a8a" strokeWidth="2" />
      <text x="36" y="20" textAnchor="middle" fill="#1e3a8a"
        fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" letterSpacing="1">
        TÜV
      </text>
      <text x="36" y="33" textAnchor="middle" fill="#1e3a8a"
        fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="9" letterSpacing="1">
        AUSTRIA
      </text>
      <text x="36" y="44" textAnchor="middle" fill="#64748b"
        fontFamily="Arial,sans-serif" fontSize="7">
        CERTIFIED
      </text>
    </svg>
  );
}

export { COMPANY };

export default function PrintHeader({ title, subtitle, docNo, revNo, revDate, pageNo, showTuv = true }) {
  return (
    <div className="border-b border-slate-900">
      {/* Top row: logo | title | TUV */}
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        {/* Left: SVT Logo + company */}
        <div className="flex items-center gap-3">
          <SvtLogo size={52} />
          <div className="text-[10px] leading-snug">
            <div className="font-extrabold text-[13px] tracking-wide text-slate-900">{COMPANY.name}</div>
            <div className="text-slate-600">Factory: {COMPANY.factory}</div>
            <div className="text-slate-600">Email: {COMPANY.email}</div>
            <div className="text-slate-600">Phone: {COMPANY.phone}</div>
          </div>
        </div>

        {/* Center: document title */}
        <div className="text-center flex-1">
          <div className="font-extrabold text-lg tracking-widest text-slate-900 uppercase">{title}</div>
          {subtitle && <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>}
        </div>

        {/* Right: TUV + doc control */}
        <div className="flex flex-col items-end gap-1">
          {showTuv && <TuvLogo size={44} />}
          {(docNo || revNo || pageNo) && (
            <table className="text-[9px] text-slate-600 border border-slate-300 mt-1">
              <tbody>
                {docNo  && <tr><td className="px-2 py-0.5 border-b border-slate-200 font-semibold">DOC NO</td><td className="px-2 py-0.5 border-b border-slate-200 font-mono">{docNo}</td></tr>}
                {revNo  && <tr><td className="px-2 py-0.5 border-b border-slate-200 font-semibold">REV NO</td><td className="px-2 py-0.5 border-b border-slate-200 font-mono">{revNo}</td></tr>}
                {revDate && <tr><td className="px-2 py-0.5 border-b border-slate-200 font-semibold">REV DATE</td><td className="px-2 py-0.5 border-b border-slate-200 font-mono">{revDate}</td></tr>}
                {pageNo && <tr><td className="px-2 py-0.5 font-semibold">PAGE NO</td><td className="px-2 py-0.5 font-mono">{pageNo}</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
