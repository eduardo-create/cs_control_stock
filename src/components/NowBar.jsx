import React, { useEffect, useState } from 'react';

export default function NowBar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatted = now.toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="flex justify-end text-xs font-semibold text-slate-500" aria-label="fecha y hora actual">
      <span className="rounded-full bg-white/60 text-slate-700 px-3 py-1 border border-slate-200 shadow-sm">{formatted}</span>
    </div>
  );
}
