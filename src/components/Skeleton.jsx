import React from 'react';

export default function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 4, columns = 4, height = 12, showHeader = false }) {
  return (
    <div className="space-y-2">
      {showHeader && <Skeleton className="h-4 w-24 rounded-full" />}
      {[...Array(rows)].map((_, idx) => (
        <div key={idx} className="grid items-center gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {[...Array(columns)].map((__, colIdx) => (
            <Skeleton key={colIdx} className="rounded-full w-full" style={{ height }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24 rounded-full" />
      {[...Array(lines)].map((_, idx) => (
        <Skeleton key={idx} className="h-3 w-full rounded-full" />
      ))}
    </div>
  );
}
