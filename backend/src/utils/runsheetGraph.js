/**
 * VHT Run Sheet stores tempGraphPoints as [{ tempC, holdMin?, label? }].
 * Test Certificate / print uses tempCycleData as [{ time, temp }] (strings or numbers).
 *
 * Mirrors `frontend/src/data/heatTreatmentCycles.js#segmentsToTempCycleData`.
 * Always prepends a 50 °C lead-in and allocates proportional ramp time between
 * segments (10 °C/min heating, 20 °C/min cooling) to match the Excel "Graphs" sheet.
 */
// Must match ROOM_TEMP_C / HEAT_RATE / COOL_RATE in frontend/src/data/heatTreatmentCycles.js
const RT_C = 50;
const HEAT_RATE = 10; // °C per minute while heating
const COOL_RATE = 20; // °C per minute while cooling

function runsheetSegmentsToTempCycleData(points) {
  if (!Array.isArray(points) || !points.length) return null;
  const firstTemp = Number(points[0].tempC);
  if (!Number.isFinite(firstTemp)) return null;

  let t = 0;
  const out = [];
  let prevTemp = firstTemp !== RT_C ? RT_C : firstTemp;
  out.push({ time: '0', temp: String(prevTemp) });

  for (let i = 0; i < points.length; i++) {
    const temp = Number(points[i].tempC);
    const hold = Number(points[i].holdMin) || 0;
    if (!Number.isFinite(temp)) continue;

    if (temp !== prevTemp) {
      const rate = temp > prevTemp ? HEAT_RATE : COOL_RATE;
      const rampMin = Math.max(1, Math.round(Math.abs(temp - prevTemp) / rate));
      t += rampMin;
      out.push({ time: String(t), temp: String(temp) });
    }

    if (hold > 0) {
      t += hold;
      out.push({ time: String(t), temp: String(temp) });
    }

    prevTemp = temp;
  }

  return out.length >= 2 ? out : null;
}

async function findRunsheetGraphForJobCard(prisma, jobCardId) {
  const runsheets = await prisma.vHTRunsheet.findMany({
    where: { items: { some: { jobCardId } } },
    orderBy: [{ runDate: 'desc' }, { id: 'desc' }],
    take: 25,
    select: {
      id: true,
      runsheetNumber: true,
      runDate: true,
      tempGraphPoints: true,
      status: true,
    },
  });

  for (const rs of runsheets) {
    let pts = rs.tempGraphPoints;
    if (typeof pts === 'string') {
      try {
        pts = JSON.parse(pts);
      } catch {
        pts = null;
      }
    }
    if (Array.isArray(pts) && pts.length) {
      const cycle = runsheetSegmentsToTempCycleData(pts);
      if (cycle?.length) {
        return {
          points: cycle,
          runsheet: {
            id: rs.id,
            runsheetNumber: rs.runsheetNumber,
            runDate: rs.runDate,
            status: rs.status,
          },
        };
      }
    }
  }
  return null;
}

module.exports = {
  runsheetSegmentsToTempCycleData,
  findRunsheetGraphForJobCard,
};
