/**
 * Invoice series ki running-number digit ginti (padWidth) set karna.
 *
 * Kyun zaroori: GST e-Invoice portal (NIC) document number 16 character se
 * lamba nahi leta. padWidth badhne se number lamba hota hai, isliye ise
 * soch-samajh kar rakhna padta hai.
 *
 *   node scripts/set-series-padwidth.js              # sirf dikhata hai
 *   node scripts/set-series-padwidth.js --apply      # badlav karta hai
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Series code ke hisaab se chahiye hui digit ginti.
const TARGET = {
  'SVT/AB': 3,
  'SVT': 4,
};

const NIC_MAX = 16;

/** Series ke code aur padWidth se ek namoona number banata hai. */
const sampleNo = (code, pad) => {
  const now = new Date();
  const y = now.getFullYear();
  const fyStart = now.getMonth() >= 3 ? y : y - 1;
  const yy = String(fyStart).slice(-2);
  const yn = String(fyStart + 1).slice(-2);
  return `${code}/${yy}-${yn}/${'9'.repeat(pad)}`;
};

(async () => {
  const apply = process.argv.includes('--apply');
  const all = await prisma.invoiceSeries.findMany({ orderBy: { id: 'asc' } });

  if (!all.length) {
    console.log('Koi invoice series nahi mili.');
    return;
  }

  console.log(`\n${apply ? 'BADLAV KAR RAHE HAIN' : 'SIRF DIKHA RAHE HAIN (--apply se badlega)'}\n`);
  console.log('  id  code        abhi  chahiye  sabse lamba number      NIC');
  console.log('  ' + '-'.repeat(64));

  for (const s of all) {
    const want = TARGET[s.code];
    const pad = want ?? s.padWidth;
    const longest = sampleNo(s.code, pad);
    const fits = longest.length <= NIC_MAX;

    console.log(
      `  ${String(s.id).padEnd(3)} ${s.code.padEnd(11)} ${String(s.padWidth).padEnd(5)} ` +
      `${want === undefined ? '(waisa hi)' : String(want).padEnd(8)} ` +
      `${longest.padEnd(22)} ${longest.length} ${fits ? 'theek' : 'LAMBA!'}`
    );

    if (!fits) {
      console.log(`      !! is padWidth par number ${longest.length} char ka ho jayega — portal reject karega.`);
    }

    if (apply && want !== undefined && want !== s.padWidth) {
      await prisma.invoiceSeries.update({ where: { id: s.id }, data: { padWidth: want } });
      console.log(`      -> padWidth ${s.padWidth} se ${want} kar diya`);
    }
  }

  console.log('\nDhyan rahe: purani invoices ke number waise hi rahenge — ye sirf aage banne walon par lagta hai.\n');
})()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
