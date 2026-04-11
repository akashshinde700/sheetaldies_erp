/**
 * ✅ SKELETON LOADER - Reusable loading state component
 * Shows while data is fetching
 */

export function SkeletonCard() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 bg-slate-200 rounded w-1/3"></div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded"></div>
        <div className="h-4 bg-slate-200 rounded w-5/6"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded"></div>
        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-slate-200">
          {Array(cols)
            .fill(0)
            .map((_, i) => (
              <th key={i} className="p-3 text-left">
                <div className="h-4 bg-slate-200 rounded w-24 animate-pulse"></div>
              </th>
            ))}
        </tr>
      </thead>
      <tbody>
        {Array(rows)
          .fill(0)
          .map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b border-slate-100">
              {Array(cols)
                .fill(0)
                .map((_, colIdx) => (
                  <td key={colIdx} className="p-3">
                    <div className="h-4 bg-slate-200 rounded w-32 animate-pulse"></div>
                  </td>
                ))}
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export function SkeletonFormField() {
  return (
    <div className="space-y-2">
      <div className="h-3 bg-slate-200 rounded w-20 animate-pulse"></div>
      <div className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
    </div>
  );
}

export function SkeletonMultiRow({ count = 3, fieldCount = 2 }) {
  return (
    <div className="space-y-4">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array(fieldCount)
              .fill(0)
              .map((_, j) => (
                <SkeletonFormField key={j} />
              ))}
          </div>
        ))}
    </div>
  );
}
