import React from 'react';

const COLUMNS: {label: string;width: string;align?: string;}[] = [
{ label: 'SR NO', width: '5.5%' },
{ label: 'CUSTOMERS', width: '33.5%' },
{ label: 'JOB CARD NO', width: '13%' },
{ label: 'JOB DESCRIPTION', width: '17%' },
{ label: 'MTRL', width: '7%' },
{ label: 'HRC REQ', width: '8%' },
{ label: 'QTY', width: '8%' },
{ label: 'W.T', width: '8%' }];


const DATA_ROWS = 16;
const RIGHT_EMPTY_ROWS = 9;
const ROW_H = '6.2mm';

export function RunSheet() {
  return (
    <main
      className="print-page bg-white text-black shadow-lg"
      style={{ width: '285mm', height: '198mm' }}
      aria-label="VHT Run Sheet">
      
      <div className="flex h-full w-full flex-col border border-black text-[10.5px] leading-none">
        {/* ================= HEADER ================= */}
        <header className="flex shrink-0" style={{ height: '16mm' }}>
          <div className="flex w-[11%] items-center justify-center border-r border-black">
            <Logo />
          </div>
          <div className="flex flex-1 items-center justify-center border-r border-black">
            <h1 className="text-[19px] font-bold tracking-wide">VHT RUN SHEET</h1>
          </div>
          <div className="flex w-[24%] flex-col items-center justify-center px-1 text-center">
            <span className="text-[19px] font-bold leading-tight">SHITAL VACUUM</span>
            <span className="text-[19px] font-bold leading-tight">TREAT PVT. LTD.</span>
          </div>
        </header>

        {/* ================= INFO BLOCK ================= */}
        <section className="flex shrink-0 border-t border-black" style={{ height: '21mm' }}>
          <div className="flex w-[76%] flex-col border-r border-black">
            <InfoRow>
              <Cell w="16%" bold>HT CYCLE NO :</Cell>
              <Cell w="18%" />
              <Cell w="14%" bold>DATE:-</Cell>
              <Cell w="18%" />
              <Cell w="16%" bold>FURNACE:-</Cell>
              <Cell w="18%" last />
            </InfoRow>
            <InfoRow border>
              <Cell w="16%" bold>CYCLE START TIME:</Cell>
              <Cell w="18%" />
              <Cell w="14%" bold>CYCLE END TIME:-</Cell>
              <Cell w="18%" />
              <Cell w="16%" bold>TOTAL TIME:-</Cell>
              <Cell w="18%" last />
            </InfoRow>
            <InfoRow border>
              <Cell w="16%" bold>M.R START:-</Cell>
              <Cell w="18%" />
              <Cell w="14%" bold>M.R END :-</Cell>
              <Cell w="18%" />
              <Cell w="16%" bold>TOTAL M.R</Cell>
              <Cell w="18%" last />
            </InfoRow>
          </div>
          <div className="flex w-[24%] flex-col">
            <div className="flex h-[7mm] items-center justify-center border-b border-black text-center font-bold">
              LOADING OPERATOR NAME:-
            </div>
            <div className="flex-1" />
          </div>
        </section>

        {/* ================= MAIN BODY ================= */}
        <section className="flex min-h-0 flex-1 border-t border-black">
          {/* -------- LEFT: entries + check points -------- */}
          <div className="flex w-[76%] flex-col border-r border-black">
            {/* column headers */}
            <div className="flex shrink-0 border-b border-black" style={{ height: '8mm' }}>
              {COLUMNS.map((col, i) =>
              <div
                key={col.label}
                style={{ width: col.width }}
                className={`flex items-center justify-center text-center font-bold ${
                i === COLUMNS.length - 1 ? '' : 'border-r border-black'}`
                }>
                
                  {col.label}
                </div>
              )}
            </div>

            {/* data rows */}
            {Array.from({ length: DATA_ROWS }).map((_, r) =>
            <div
              key={r}
              style={{ height: ROW_H }}
              className={`flex shrink-0 ${r === DATA_ROWS - 1 ? '' : 'border-b border-black'}`}>
              
                {COLUMNS.map((col, i) =>
              <div
                key={col.label}
                style={{ width: col.width }}
                className={i === COLUMNS.length - 1 ? '' : 'border-r border-black'} />

              )}
              </div>
            )}

            {/* check points block */}
            <div className="flex shrink-0 border-y border-black" style={{ height: '6.6mm' }}>
              <div className="flex flex-1 items-center border-r border-black pl-1 font-bold">
                CHECK POINTS:-
              </div>
              <div className="flex w-[8%] items-center justify-center border-r border-black font-bold">
                TOTAL
              </div>
              <div className="w-[16%]" />
            </div>

            <CheckRow>
              <Cell w="42%" bold pad>1) GAS PRESSURE:-</Cell>
              <Cell w="28%" bold pad>WATER CIRCULATION:-</Cell>
              <Cell w="30%" last />
            </CheckRow>
            <CheckRow>
              <Cell w="25%" bold pad>2) POWER FAILURE:-</Cell>
              <Cell w="8%" bold pad>FROM:-</Cell>
              <Cell w="14%" />
              <Cell w="8%" bold pad>TO :-</Cell>
              <Cell w="18%" />
              <Cell w="27%" last />
            </CheckRow>
            <CheckRow>
              <Cell w="100%" bold pad last>3) OTHER :-</Cell>
            </CheckRow>
            <CheckRow>
              <Cell w="100%" bold pad last>
                4) After processing within 24 hrs, Supervisor shall verify process parameter (graph) &amp; sign below
              </Cell>
            </CheckRow>
            <CheckRow>
              <Cell w="100%" bold pad last>Remark:-</Cell>
            </CheckRow>
            <div className="flex min-h-0 flex-1 border-t border-black">
              <div className="flex w-[16%] items-center border-r border-black pl-1 font-bold">
                OPERATORS SIGN:-
              </div>
              <div className="w-[26%] border-r border-black" />
              <div className="flex w-[26%] items-center border-r border-black pl-1 font-bold">
                PROD. SUPERVISOR SIGN:-
              </div>
              <div className="w-[32%]" />
            </div>
          </div>

          {/* -------- RIGHT: fixtures / cycle parameters / graph -------- */}
          <div className="flex w-[24%] flex-col">
            <div className="flex shrink-0 border-b border-black" style={{ height: '8mm' }}>
              <div className="flex w-[32%] items-center justify-center border-r border-black text-center font-bold">
                FIXTURES
              </div>
              <div className="flex w-[36%] items-center justify-center border-r border-black text-center font-bold">
                T.C. POSITION
              </div>
              <div className="flex w-[32%] items-center justify-center text-center font-bold">
                INSTRUCTION
              </div>
            </div>

            {Array.from({ length: RIGHT_EMPTY_ROWS }).map((_, r) =>
            <div key={r} style={{ height: ROW_H }} className="flex shrink-0">
                <div className="w-[32%] border-r border-black" />
                <div className="w-[36%] border-r border-black" />
                <div className="w-[32%]" />
              </div>
            )}

            <div
              className="flex shrink-0 items-center justify-center border-y border-black text-center font-bold"
              style={{ height: '6.6mm' }}>
              
              CYCLE PARAMETERS
            </div>
            <div className="flex shrink-0 items-center border-b border-black pl-1" style={{ height: '7mm' }}>
              Type Of Hardening:-
            </div>
            <div className="flex shrink-0 items-center border-b border-black pl-1" style={{ height: '7mm' }}>
              Quenching Pressure:-
            </div>
            <div className="flex shrink-0 items-center border-b border-black pl-1" style={{ height: '7mm' }}>
              Fan Speed in :-
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center font-bold">GRAPH</div>
          </div>
        </section>

        {/* ================= FOOTER ================= */}
        <footer
          className="flex shrink-0 items-center border-t border-black font-bold"
          style={{ height: '7mm' }}>
          
          <span className="w-[14%] pl-1">QF/PD/02</span>
          <span className="w-[24%]">REV. NO:- 01</span>
          <span className="w-[34%]">EFFECTIVE DATE: 01/08/2021</span>
          <span className="w-[28%]">PAGE 1 OF 2</span>
        </footer>
      </div>
    </main>);

}

type CellProps = {
  w: string;
  bold?: boolean;
  pad?: boolean;
  last?: boolean;
  children?: React.ReactNode;
};

function Cell({ w, bold, pad, last, children }: CellProps) {
  return (
    <div
      style={{ width: w }}
      className={`flex items-center ${last ? '' : 'border-r border-black'} ${
      bold || pad ? 'pl-1' : ''} ${
      bold ? 'font-bold' : ''}`}>
      
      {children}
    </div>);

}

function InfoRow({ children, border }: {children: React.ReactNode;border?: boolean;}) {
  return (
    <div className={`flex flex-1 ${border ? 'border-t border-black' : ''}`}>{children}</div>);

}

function CheckRow({ children }: {children: React.ReactNode;}) {
  return (
    <div className="flex shrink-0 border-b border-black" style={{ height: '6.6mm' }}>
      {children}
    </div>);

}

function Logo() {
  return (
    <svg viewBox="0 0 100 100" className="h-[13mm] w-[13mm]" role="img" aria-label="Shital Vacuum Treat logo">
      <circle cx="50" cy="50" r="47" fill="none" stroke="#000" strokeWidth="3" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#000" strokeWidth="1.5" />
      <path
        d="M28 34 h44 l-10 16 h10 l-14 22 h-30 l10 -16 h-10 z"
        fill="#000" />
      
      <text
        x="50"
        y="90"
        textAnchor="middle"
        fontSize="9"
        fontWeight="bold"
        fill="#000"
        fontFamily="Arial, sans-serif">
        
        VACUUM
      </text>
    </svg>);

}