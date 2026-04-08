/**
 * VHT Run Sheet stores tempGraphPoints as [{ tempC, holdMin?, label? }].
 * Test Certificate / print uses tempCycleData as [{ time, temp }] (strings or numbers).
 */
function runsheetSegmentsToTempCycleData(points) {
  if (!Array.isArray(points) || !points.length) return null;
  const firstTemp = Number(points[0].tempC);
  if (!Number.isFinite(firstTemp)) return null;

  let t = 0;
  const out = [{ time: String(t), temp: String(firstTemp) }];

  for (let i = 0; i < points.length; i++) {
    const temp = Number(points[i].tempC);
    const hold = Number(points[i].holdMin) || 0;
    if (!Number.isFinite(temp)) continue;

    if (i > 0) {
      const last = out[out.length - 1];
      if (Number(last.temp) !== temp) {
        out.push({ time: String(t), temp: String(temp) });
      }
    }
    t += hold;
    out.push({ time: String(t), temp: String(temp) });
  }

  out.push({ time: String(t + 10), temp: '80' });
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
