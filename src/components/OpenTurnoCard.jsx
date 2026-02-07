import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function authFetch(path, opts = {}, token) {
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

const TURNO_OPCIONES = ['Turno mañana', 'Turno tarde'];

function displayTurnoNombre(desc) {
  const clean = (desc || '').replace(/^turno\s+/i, '').trim();
  return clean ? `Turno ${clean}` : 'Turno';
}

export default function OpenTurnoCard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [locales, setLocales] = useState([]);
  const [localId, setLocalId] = useState(user?.local_id ? String(user.local_id) : '');
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [descripcion, setDescripcion] = useState('');
  const [turnoLoading, setTurnoLoading] = useState(false);
  const [cajaLoading, setCajaLoading] = useState(false);
  const [turnoAbierto, setTurnoAbierto] = useState(null);
  const [popup, setPopup] = useState(null);
  const [msg, setMsg] = useState(null);

  const puedeAbrir = user && user.rol !== 'superadmin';

  useEffect(() => {
    if (!puedeAbrir) return;
    authFetch('/api/locales', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (!Array.isArray(data)) return;
        setLocales(data);

        // si el usuario tiene local_id y existe en la lista, usarlo
        if (user?.local_id) {
          const existe = data.some(l => Number(l.id) === Number(user.local_id));
          if (existe) {
            setLocalId(String(user.local_id));
            return;
          }
        }

        // si no hay selección y solo hay un local, usarlo
        if (!localId && data.length === 1) {
          setLocalId(String(data[0].id));
        }
      })
      .catch(() => {});
  }, [token, puedeAbrir, user?.local_id, localId]);

  useEffect(() => {
    if (!puedeAbrir || !token) return;
    const targetLocal = user?.local_id || localId;
    if (!targetLocal) return;
    authFetch(`/api/turnos/actual?local_id=${targetLocal}`, {}, token)
      .then(async r => {
        if (!r.ok && r.status !== 404) {
          const txt = await r.text();
          throw new Error(txt || `Error ${r.status}`);
        }
        return r.json();
      })
      .then(data => {
        const turnoData = data?.turno !== undefined ? data.turno : data;
        if (turnoData && turnoData.id) {
          setTurnoAbierto(turnoData);
          const desc = turnoData.descripcion || '';
          const match = TURNO_OPCIONES.find(opt => opt.toLowerCase() === desc.toLowerCase());
          setDescripcion(match || '');
          setSaldoInicial(String(turnoData.saldo_inicial ?? saldoInicial));
        }
      })
      .catch(() => {});
  }, [puedeAbrir, token, user?.local_id, localId]);

  async function abrirTurno() {
    const monto = Number(saldoInicial);
    if (!localId) {
      setMsg({ type: 'error', text: 'Selecciona un local' });
      return;
    }
    if (!descripcion) {
      setMsg({ type: 'error', text: 'Selecciona el turno (mañana o tarde)' });
      return;
    }
    if (Number.isNaN(monto)) {
      setMsg({ type: 'error', text: 'Saldo inicial inválido' });
      return;
    }
    setTurnoLoading(true);
    setMsg(null);
    try {
      const body = { local_id: Number(localId), saldo_inicial: monto, descripcion: descripcion || null };
      const res = await authFetch('/api/turnos/abrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }, token);
      if (!res.ok) {
        let errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.message) errText = parsed.message;
        } catch (_) {}
        // Si ya hay turno abierto u otro 400, avisar pero permitir seguir con la caja
        if (res.status === 400) {
          setTurnoAbierto(prev => prev || { descripcion, id: null });
          setMsg({ type: 'success', text: errText || 'Turno ya abierto para este local. Puedes abrir la caja.' });
          setPopup({ tipo: 'abierto', descripcion: descripcion || 'turno', mensaje: errText || 'Turno abierto previamente' });
          return;
        }
        throw new Error(errText || `Error ${res.status}`);
      }
      const data = await res.json();
      const turnoData = data?.turno || data;
      setTurnoAbierto(turnoData);
      setPopup({ tipo: 'abierto', descripcion: turnoData?.descripcion || descripcion, mensaje: 'Turno abierto satisfactoriamente' });
      setMsg({ type: 'success', text: 'Turno abierto. Ahora abre la caja para operar.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'No se pudo abrir el turno' });
    } finally {
      setTurnoLoading(false);
    }
  }

  async function cerrarTurno() {
    if (!turnoAbierto?.id) {
      setMsg({ type: 'error', text: 'No hay turno abierto para cerrar' });
      return;
    }
    setTurnoLoading(true);
    setMsg(null);
    try {
      const res = await authFetch(`/api/turnos/cerrar/${turnoAbierto.id}`, { method: 'PUT' }, token);
      if (!res.ok) {
        let errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.message) errText = parsed.message;
        } catch (_) {}
        throw new Error(errText || `Error ${res.status}`);
      }
      const closed = await res.json();
      setTurnoAbierto(null);
      setPopup({ tipo: 'cerrado', descripcion: closed?.turno?.descripcion || descripcion, mensaje: `Se cerró correctamente ${closed?.turno?.descripcion ? displayTurnoNombre(closed.turno.descripcion) : 'el turno'}` });
      setMsg({ type: 'success', text: 'Turno cerrado. Puedes abrir uno nuevo.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'No se pudo cerrar el turno' });
    } finally {
      setTurnoLoading(false);
    }
  }

  async function abrirCaja() {
    const monto = Number(saldoInicial);
    if (!localId) {
      setMsg({ type: 'error', text: 'Selecciona un local' });
      return;
    }
    if (!user?.id) {
      setMsg({ type: 'error', text: 'No se encontró el usuario para abrir caja' });
      return;
    }
    if (Number.isNaN(monto)) {
      setMsg({ type: 'error', text: 'Saldo inicial inválido' });
      return;
    }
    if (!turnoAbierto) {
      setMsg({ type: 'error', text: 'Abre un turno antes de abrir la caja' });
      return;
    }
    setCajaLoading(true);
    setMsg(null);
    try {
      const body = {
        local_id: Number(localId),
        usuario_id: user.id,
        monto_inicial: monto,
        turno_id: turnoAbierto?.id || undefined
      };
      const res = await authFetch('/api/caja/apertura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }, token);
      if (!res.ok) {
        let errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.message) errText = parsed.message;
        } catch (_) {}
        if (res.status === 400) {
          setMsg({ type: 'success', text: errText || 'Caja ya abierta para este local. Redirigiendo al POS...' });
          setTimeout(() => navigate('/pos'), 600);
          return;
        }
        throw new Error(errText || `Error ${res.status}`);
      }

      const data = await res.json();
      const cajaTurno = data?.turno || data;
      if (cajaTurno?.id && localId) {
        localStorage.setItem(`caja_turno_id_${localId}`, String(cajaTurno.id));
      }

      setMsg({ type: 'success', text: 'Caja abierta. Redirigiendo al POS...' });
      setTimeout(() => navigate('/pos'), 600);
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'No se pudo abrir la caja' });
    } finally {
      setCajaLoading(false);
    }
  }

  if (!puedeAbrir) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Abrir Turno</p>
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Turno</span>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Local</span>
          <select
            value={localId}
            onChange={e => setLocalId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          >
            <option value="">Selecciona</option>
            {locales.map(l => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Saldo inicial</span>
          <input
            type="number"
            value={saldoInicial}
            onChange={e => setSaldoInicial(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700 space-y-1">
          <span className="block">Turno</span>
          <select
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
          >
            <option value="">Selecciona turno</option>
            {TURNO_OPCIONES.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>

        <div className="pt-3 mt-1 border-t border-slate-100 space-y-2">
          <button
            onClick={turnoAbierto ? cerrarTurno : abrirTurno}
            disabled={turnoLoading}
            className={`w-full rounded-xl text-white font-semibold px-4 py-3 shadow-lg shadow-slate-900/20 transition disabled:opacity-60 ${turnoAbierto ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {turnoLoading ? (turnoAbierto ? 'Cerrando turno...' : 'Abriendo turno...') : (turnoAbierto ? 'Cerrar turno' : 'Abrir turno')}
          </button>

          <button
            onClick={abrirCaja}
            disabled={!turnoAbierto || cajaLoading}
            className="w-full rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold px-4 py-3 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            {cajaLoading ? 'Abriendo caja...' : 'Abrir caja y POS'}
          </button>

          {turnoAbierto && (
            <p className="text-xs font-semibold text-slate-600">Turno listo: {turnoAbierto.descripcion || 'sin descripción'}</p>
          )}
        </div>

        {msg && (
          <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${msg.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {msg.text}
          </div>
        )}
      </div>

      {popup && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">{popup.tipo === 'cerrado' ? 'Turno cerrado' : 'Turno abierto'}</p>
                <h3 className="text-xl font-bold text-slate-900">{displayTurnoNombre(popup.descripcion)}</h3>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setPopup(null)} aria-label="Cerrar aviso">
                x
              </button>
            </div>
            <p className="text-sm text-slate-600">{popup.mensaje || 'Turno abierto satisfactoriamente. Ahora abre la caja para operar en el POS.'}</p>
            <div className="flex justify-end">
              <button onClick={() => setPopup(null)} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow shadow-slate-900/15">Continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
