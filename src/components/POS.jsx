import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import Skeleton from './Skeleton';

function authFetch(path, opts = {}, token) {
  const headers = Object.assign({}, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(path, Object.assign({}, opts, { headers, credentials: 'include' }));
}

function money(n) {
  return Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatTime(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}

export default function POS() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [client, setClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentLines, setPaymentLines] = useState([{ metodo_id: '', monto: '' }]);
  const [ventasFeed, setVentasFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState('');
  const [ventaModal, setVentaModal] = useState(null);
  const [ventaEdit, setVentaEdit] = useState(null);
  const [ventaSaving, setVentaSaving] = useState(false);
  const [ventaEditError, setVentaEditError] = useState('');
  const [categories, setCategories] = useState([]);
  const [catModal, setCatModal] = useState(null);
  const [search, setSearch] = useState('');
  const [turno, setTurno] = useState(null);
  const [turnoLoading, setTurnoLoading] = useState(true);
  const [localId, setLocalId] = useState(user?.local_id ? String(user.local_id) : '');
  const [locales, setLocales] = useState([]);
  const [closing, setClosing] = useState(false);
  const [confirmCerrarCaja, setConfirmCerrarCaja] = useState(false);
  const [montoFinal, setMontoFinal] = useState('');
  const [retiroModal, setRetiroModal] = useState(false);
  const [retiroMonto, setRetiroMonto] = useState('');
  const [retiroMotivo, setRetiroMotivo] = useState('');
  const [retiroLoading, setRetiroLoading] = useState(false);
  const [promos, setPromos] = useState([]);
  const [promoCart, setPromoCart] = useState([]);
  const [promoSelection, setPromoSelection] = useState({ promocion_id: '', cantidad: 1, items: [] });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [descuentoMonto, setDescuentoMonto] = useState('');
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState('');
  const [cuponCodigo, setCuponCodigo] = useState('');
  const [cuponMonto, setCuponMonto] = useState('');
  const [adicionalManual, setAdicionalManual] = useState('');
  const [pagaCon, setPagaCon] = useState('');
  const [cobrado, setCobrado] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [empleadoId, setEmpleadoId] = useState('');

  function resolveLocal() {
    const fallback = user?.local_id || localId || (locales.length === 1 ? String(locales[0].id) : '');
    if (!user?.local_id && !localId && fallback) {
      setLocalId(String(fallback));
    }
    return fallback;
  }

  // Carga inicial de datos (productos, clientes, cat, promos, locales, metodos de pago)
  useEffect(() => {
    let cancelled = false;

    authFetch('/api/productos', {}, token)
      .then(r => {
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) {
            toast.error('No autorizado. Inicia sesión.');
            localStorage.removeItem('token');
            setProducts([]);
            return null;
          }
          throw new Error(`API error ${r.status}`);
        }
        return r.json();
      })
      .then(data => { if (!cancelled && Array.isArray(data)) setProducts(data); })
      .catch((e) => { console.error(e); if (!cancelled) setProducts([]); });

    authFetch('/api/clientes', {}, token)
      .then(r => {
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) {
            toast.error('No autorizado. Inicia sesión.');
            localStorage.removeItem('token');
            return null;
          }
          throw new Error(`API error ${r.status}`);
        }
        return r.json();
      })
      .then(data => { if (!cancelled && Array.isArray(data)) setClients(data); })
      .catch(() => {});

    authFetch('/api/metodos-pago', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setPaymentMethods(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setPaymentMethods([]); });

    authFetch('/api/empleados', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setEmpleados(Array.isArray(data) ? data : []); })
      .catch(() => {});

    authFetch('/api/categorias', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled && Array.isArray(data)) setCategories(data); })
      .catch(() => { if (!cancelled) setCategories([]); });

    authFetch('/api/promociones', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setPromos(Array.isArray(data) ? data : []); })
      .catch(() => {});

    authFetch('/api/locales', {}, token)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (!cancelled && Array.isArray(data)) {
          setLocales(data);
          if (!user?.local_id && !localId && data.length === 1) {
            setLocalId(String(data[0].id));
          }
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [token]);

  async function fetchVentasFeed(targetLocal, cancelledRef) {
    if (!targetLocal) return;
    try {
      setFeedLoading(true);
      setFeedError('');
      const r = await authFetch(`/api/ventas/pos-feed?local_id=${targetLocal}`, {}, token);
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || 'No se pudo cargar las ventas');
      }
      const data = await r.json();
      if (!cancelledRef?.current) setVentasFeed(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!cancelledRef?.current) setFeedError(e.message || 'Error al cargar ventas');
    } finally {
      if (!cancelledRef?.current) setFeedLoading(false);
    }
  }

  useEffect(() => {
    const cancelledRef = { current: false };
    const targetLocal = resolveLocal();
    if (!targetLocal) return () => { cancelledRef.current = true; };

    const load = () => fetchVentasFeed(targetLocal, cancelledRef);
    load();
    const timer = setInterval(load, 45000);
    return () => { cancelledRef.current = true; clearInterval(timer); };
  }, [token, localId, turno?.id]);

  // Obtener turno/caja abierta una vez que tengamos local definido
  useEffect(() => {
    let cancelled = false;
    setTurnoLoading(true);

    (async () => {
      try {
        const targetLocal = resolveLocal();
        if (!targetLocal) {
          if (!cancelled) setTurno(null);
          return;
        }
        const turnoId = await findCajaTurnoId(targetLocal);
        if (!cancelled) setTurno(turnoId ? { id: turnoId } : null);
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || 'Error al obtener turno');
          setTurno(null);
        }
      } finally {
        if (!cancelled) setTurnoLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token, user?.local_id, localId, locales]);

  async function findCajaTurnoId(targetLocal) {
    const storedId = localStorage.getItem(`caja_turno_id_${targetLocal}`);
    if (storedId) return Number(storedId);

    const fechas = [0, -1].map(delta => {
      const d = new Date();
      d.setDate(d.getDate() + delta);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });

    for (const fecha of fechas) {
      const cajaRes = await authFetch(`/api/caja/turnos/${targetLocal}?fecha=${fecha}`, {}, token);
      if (cajaRes.status === 404) continue;
      if (!cajaRes.ok) {
        const txt = await cajaRes.text();
        throw new Error(txt || 'No se pudo obtener el turno de caja');
      }
      const cajaData = await cajaRes.json();
      const turnoCaja = (cajaData?.turnos || []).find(t => t.estado === 'abierta');
      if (turnoCaja?.turno_id) return turnoCaja.turno_id;
    }
    return null;
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return [];
    return products.filter(p => p.nombre.toLowerCase().includes(q));
  }, [products, search]);

  function add(product) {
    setCart(prev => {
      const existing = prev.find(p => p.producto_id === product.id);
      if (existing) {
        return prev.map(p => p.producto_id === product.id ? { ...p, cantidad: p.cantidad + 1 } : p);
      }
      return [...prev, { producto_id: product.id, nombre: product.nombre, cantidad: 1, precio: product.precio }];
    });
  }

  function removeOne(product) {
    setCart(prev => prev
      .map(item => item.producto_id === product.id ? { ...item, cantidad: item.cantidad - 1 } : item)
      .filter(item => item.cantidad > 0));
  }

  function changeQty(producto_id, delta) {
    setCart(prev => prev
      .map(item => item.producto_id === producto_id ? { ...item, cantidad: item.cantidad + delta } : item)
      .filter(item => item.cantidad > 0));
  }

  function addPaymentLine() {
    setPaymentLines(prev => [...prev, { metodo_id: '', monto: '' }]);
  }

  function updatePaymentLine(idx, key, value) {
    setPaymentLines(prev => prev.map((p, i) => i === idx ? { ...p, [key]: value } : p));
  }

  function removePaymentLine(idx) {
    setPaymentLines(prev => prev.filter((_, i) => i !== idx));
  }

  function autofillPagoConTotal() {
    const target = totalFinal.toFixed(2);
    setPaymentLines(prev => (prev.length === 0 ? [{ metodo_id: '', monto: target }] : prev.map((p, idx) => idx === 0 ? { ...p, monto: target } : p)));
    setPagaCon(totalFinal.toFixed(2));
  }

  function generarCupon() {
    const code = `PROM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setCuponCodigo(code);
  }

  const productsByCategory = useMemo(() => {
    const map = {};
    for (const p of products) {
      const cats = Array.isArray(p.categoria_ids) && p.categoria_ids.length
        ? p.categoria_ids
        : [p.categoria_id || p.categoria || p.categoriaId].filter(Boolean);
      for (const catId of cats) {
        const key = String(catId);
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
    }
    return map;
  }, [products]);

  const productById = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  function handleSelectPromo(promoId) {
    const promo = promos.find(p => String(p.id) === String(promoId));
    if (!promo) {
      setPromoSelection({ promocion_id: '', cantidad: 1, items: [] });
      return;
    }
    const items = (promo.configuraciones || []).map(cfg => {
      const catProducts = productsByCategory[String(cfg.categoria_id)] || [];
      const defaultProd = cfg.aplica_todos ? (catProducts[0]?.id || '') : (cfg.producto_id || '');
      return {
        config_id: cfg.id || `cfg-${cfg.categoria_id}-${Math.random()}`,
        categoria_id: cfg.categoria_id,
        aplica_todos: !!cfg.aplica_todos,
        cantidad_min: cfg.cantidad_min || 0,
        cantidad_max: cfg.cantidad_max || 0,
        producto_id: defaultProd ? Number(defaultProd) : '',
        cantidad: cfg.cantidad_min && cfg.cantidad_min > 0 ? cfg.cantidad_min : 1,
      };
    });
    setPromoSelection({ promocion_id: promo.id, cantidad: 1, items });
  }

  function updatePromoItem(idx, key, value) {
    setPromoSelection(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === idx ? { ...it, [key]: value } : it)
    }));
  }

  function totalPorConfig(configId) {
    return promoSelection.items
      .filter(it => it.config_id === configId)
      .reduce((sum, it) => sum + Number(it.cantidad || 0), 0);
  }

  function addPromoProduct(configId) {
    setPromoSelection(prev => {
      const template = prev.items.find(it => it.config_id === configId);
      if (!template) return prev;
      const currentTotal = totalPorConfig(configId);
      const limite = template.cantidad_max && template.cantidad_max > 0 ? template.cantidad_max : null;
      if (limite && currentTotal >= limite) {
        toast.error(`Límite máximo ${limite} para esta categoría en la promo`);
        return prev;
      }
      const catProducts = productsByCategory[String(template.categoria_id)] || [];
      const defaultProd = catProducts[0]?.id || '';
      const newItem = {
        ...template,
        producto_id: defaultProd ? Number(defaultProd) : '',
        cantidad: 1,
      };
      return { ...prev, items: [...prev.items, newItem] };
    });
  }

  function removePromoProduct(idx) {
    setPromoSelection(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  }

  function addPromoToCart() {
    const { promocion_id, cantidad, items } = promoSelection;
    if (!promocion_id) {
      toast.error('Selecciona una promoción');
      return;
    }
    const promo = promos.find(p => p.id === promocion_id);
    if (!promo) {
      toast.error('Promoción no válida');
      return;
    }
    if (!items || items.length === 0 || items.some(it => !it.producto_id || !it.cantidad || it.cantidad <= 0)) {
      toast.error('Completa los productos y cantidades de la promoción');
      return;
    }
      // Validar mínimos/máximos por configuración
      const grouped = items.reduce((acc, it) => {
        acc[it.config_id] = acc[it.config_id] || { min: it.cantidad_min || 0, max: it.cantidad_max || 0, total: 0 };
        acc[it.config_id].total += Number(it.cantidad || 0);
        return acc;
      }, {});
      for (const key of Object.keys(grouped)) {
        const { min, max, total } = grouped[key];
        if (min && total < min) {
          toast.error(`Debes seleccionar al menos ${min} en una categoría de la promo`);
          return;
        }
        if (max && max > 0 && total > max) {
          toast.error(`Excede el máximo permitido (${max}) en una categoría de la promo`);
          return;
        }
      }
    setPromoCart(prev => [...prev, {
      promocion_id,
      nombre: promo.nombre,
      cantidad: Number(cantidad) || 1,
      precio_final: Number(promo.precio_final || 0),
      items: items.map(it => ({ producto_id: Number(it.producto_id), cantidad: Number(it.cantidad || 0) }))
    }]);
    setPromoSelection({ promocion_id: '', cantidad: 1, items: [] });
    toast.success('Promoción agregada al carrito');
  }

  function removePromo(index) {
    setPromoCart(prev => prev.filter((_, i) => i !== index));
  }

  const totalProductos = useMemo(() => cart.reduce((s, i) => s + i.precio * i.cantidad, 0), [cart]);
  const totalPromos = useMemo(() => promoCart.reduce((s, p) => s + (p.precio_final || 0) * p.cantidad, 0), [promoCart]);
  const total = useMemo(() => totalProductos + totalPromos, [totalProductos, totalPromos]);
  const descuentoMontoNum = useMemo(() => Math.max(0, num(descuentoMonto)), [descuentoMonto]);
  const descuentoPctNum = useMemo(() => Math.max(0, num(descuentoPorcentaje)), [descuentoPorcentaje]);
  const descuentoPctMonto = useMemo(() => (descuentoPctNum > 0 ? total * (descuentoPctNum / 100) : 0), [descuentoPctNum, total]);
  const cuponMontoNum = useMemo(() => Math.max(0, num(cuponMonto)), [cuponMonto]);
  const adicionalNum = useMemo(() => Math.max(0, num(adicionalManual)), [adicionalManual]);
  const totalFinal = useMemo(() => {
    const bruto = total + adicionalNum - descuentoMontoNum - descuentoPctMonto - cuponMontoNum;
    return Math.max(0, bruto);
  }, [total, adicionalNum, descuentoMontoNum, descuentoPctMonto, cuponMontoNum]);
  const totalPagos = useMemo(() => paymentLines.reduce((s, p) => s + (num(p.monto) || 0), 0), [paymentLines]);
  const totalPagosEdit = useMemo(() => (ventaEdit?.pagos || []).reduce((s, p) => s + (num(p.monto) || 0), 0), [ventaEdit]);
  const pagaConNum = useMemo(() => {
    const val = num(pagaCon);
    return Number.isFinite(val) && val > 0 ? val : totalFinal;
  }, [pagaCon, totalFinal]);
  const vueltoCalculado = useMemo(() => Math.max(0, pagaConNum - totalFinal), [pagaConNum, totalFinal]);
  const faltante = useMemo(() => Math.max(0, totalFinal - totalPagos), [totalFinal, totalPagos]);

  async function checkout() {
    const targetLocal = resolveLocal();
    if (!targetLocal) {
      toast.error('Asigna un local al usuario o selecciona uno único');
      return;
    }
    if (cart.length === 0 && promoCart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    const pagosClean = (cobrado ? paymentLines : []).map(p => ({
      metodo_id: Number(p.metodo_id),
      monto: Number(p.monto)
    })).filter(p => p.metodo_id && p.monto > 0);

    if (cobrado) {
      if (pagosClean.length === 0) {
        toast.error('Agrega al menos un pago o desmarca "Cobrado"');
        return;
      }
      if (faltante > 0.02) {
        toast.error('Los pagos no cubren el total');
        return;
      }
    }

    const payload = {
      productos: cart.map(c => ({ producto_id: c.producto_id, cantidad: c.cantidad })),
      promociones: promoCart.map(p => ({
        promocion_id: p.promocion_id,
        cantidad: p.cantidad,
        items: p.items
      })),
      pagos: pagosClean,
      cliente_id: client ? Number(client) : null,
      local_id: targetLocal,
      descuento_monto: descuentoMontoNum,
      descuento_porcentaje: descuentoPctNum,
      cupon_codigo: cuponCodigo || null,
      cupon_monto: cuponMontoNum,
      adicional_manual: adicionalNum,
      paga_con: pagaCon || null,
      vuelto: vueltoCalculado,
      cobrado: cobrado,
      observaciones: observaciones || null,
      empleado_id: empleadoId || user?.id,
      total_final: totalFinal
    };
    try {
      const r = await authFetch('/api/ventas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, token);
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || `API error ${r.status}`);
      }
      await r.json();
      toast.success('Venta registrada satisfactoriamente');
      setCart([]);
      setPromoCart([]);
      setPaymentLines([{ metodo_id: '', monto: '' }]);
      setDescuentoMonto('');
      setDescuentoPorcentaje('');
      setCuponCodigo('');
      setCuponMonto('');
      setAdicionalManual('');
      setPagaCon('');
      setObservaciones('');
      setCobrado(true);
    } catch (err) {
      toast.error(err.message || 'Error en venta');
    }
  }

  function solicitarCerrarCaja() {
    const targetLocal = resolveLocal();
    if (!targetLocal) {
      toast.error('Asigna un local al usuario o selecciona el único local antes de cerrar caja');
      return;
    }
    setConfirmCerrarCaja(true);
  }

  async function cerrarCaja() {
    const targetLocal = resolveLocal();
    if (!targetLocal) {
      toast.error('Asigna un local al usuario o selecciona el único local antes de cerrar caja');
      return;
    }
    const contado = montoFinal === '' ? null : Number(montoFinal);
    if (montoFinal !== '' && Number.isNaN(contado)) {
      toast.error('Ingresa un monto final válido o déjalo vacío para usar el teórico');
      return;
    }
    try {
      setClosing(true);
      const turnoCajaId = await findCajaTurnoId(targetLocal);
      if (!turnoCajaId) throw new Error('No hay caja abierta para este local');

      const cierreCajaRes = await authFetch(`/api/caja/cierre/${turnoCajaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto_final: contado })
      }, token);
      if (!cierreCajaRes.ok) {
        const txt = await cierreCajaRes.text();
        throw new Error(txt || `Error ${cierreCajaRes.status}`);
      }

      const storedId = localStorage.getItem(`caja_turno_id_${targetLocal}`);
      if (storedId) {
        localStorage.removeItem(`caja_turno_id_${targetLocal}`);
      }

      toast.success('Caja cerrada');
      navigate('/inicio');
    } catch (e) {
      toast.error(e.message || 'No se pudo cerrar la caja');
    } finally {
      setClosing(false);
      setConfirmCerrarCaja(false);
    }
  }

  async function registrarRetiro() {
    const targetLocal = resolveLocal();
    if (!targetLocal) {
      toast.error('Asigna o selecciona un local antes de retirar');
      return;
    }
    const monto = Number(retiroMonto);
    if (Number.isNaN(monto) || monto <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    try {
      setRetiroLoading(true);
      const turnoCajaId = await findCajaTurnoId(targetLocal);
      if (!turnoCajaId) throw new Error('No hay caja abierta para este local');

      const res = await authFetch('/api/caja/retiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turno_id: turnoCajaId, monto, motivo: retiroMotivo || null })
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'No se pudo registrar el retiro');
      }
      await res.json();
      toast.success('Retiro registrado');
      setRetiroModal(false);
      setRetiroMonto('');
      setRetiroMotivo('');
    } catch (e) {
      toast.error(e.message || 'Error en retiro');
    } finally {
      setRetiroLoading(false);
    }
  }

  async function anularVenta(ventaId) {
    if (!ventaId) return;
    const confirmar = window.confirm('¿Seguro que deseas anular esta venta?');
    if (!confirmar) return;
    try {
      const res = await authFetch(`/api/ventas/${ventaId}/cancel`, { method: 'POST' }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'No se pudo anular');
      }
      await res.json();
      toast.success('Venta anulada');
      setVentaModal(null);
      setVentaEdit(null);
      fetchVentasFeed(resolveLocal(), { current: false });
    } catch (e) {
      toast.error(e.message || 'Error al anular');
    }
  }

  function openVentaModal(v) {
    setVentaModal(v);
    setVentaEdit({
      cobrado: !!v.cobrado,
      empleado_id: v.empleado_id ? String(v.empleado_id) : '',
      observaciones: v.observaciones || '',
      paga_con: v.paga_con ?? '',
      vuelto: v.vuelto ?? '',
      pagos: Array.isArray(v.pagos) && v.pagos.length > 0 ? v.pagos.map(p => ({
        metodo_id: p.metodo_id ? String(p.metodo_id) : '',
        monto: p.monto ?? ''
      })) : [{ metodo_id: '', monto: '' }]
    });
    setVentaEditError('');
  }

  function updateVentaPago(idx, key, value) {
    setVentaEdit(prev => ({
      ...prev,
      pagos: (prev?.pagos || []).map((p, i) => i === idx ? { ...p, [key]: value } : p)
    }));
  }

  function addVentaPago() {
    setVentaEdit(prev => ({ ...prev, pagos: [...(prev?.pagos || []), { metodo_id: '', monto: '' }] }));
  }

  function removeVentaPago(idx) {
    setVentaEdit(prev => ({ ...prev, pagos: (prev?.pagos || []).filter((_, i) => i !== idx) }));
  }

  async function guardarVentaEdit() {
    if (!ventaModal || !ventaEdit) return;
    const totalVenta = num(ventaModal.total, 0);
    const pagosList = ventaEdit.cobrado ? (ventaEdit.pagos || []).filter(p => num(p.monto) > 0 && p.metodo_id) : [];
    const totalPagos = pagosList.reduce((s, p) => s + num(p.monto), 0);
    if (ventaEdit.cobrado && Math.abs(totalPagos - totalVenta) > 0.02) {
      setVentaEditError('Los pagos deben coincidir con el total');
      return;
    }
    try {
      setVentaSaving(true);
      setVentaEditError('');
      const payload = {
        cobrado: !!ventaEdit.cobrado,
        observaciones: ventaEdit.observaciones || null,
        empleado_id: ventaEdit.empleado_id || null,
        paga_con: ventaEdit.paga_con || null,
        vuelto: ventaEdit.vuelto || 0,
        pagos: pagosList
      };
      const res = await authFetch(`/api/ventas/${ventaModal.id}/cobro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, token);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'No se pudo actualizar la venta');
      }
      const data = await res.json();
      toast.success('Venta actualizada');
      setVentaModal(data);
      openVentaModal(data);
      fetchVentasFeed(resolveLocal(), { current: false });
    } catch (e) {
      setVentaEditError(e.message || 'Error al actualizar');
      toast.error(e.message || 'Error al actualizar');
    } finally {
      setVentaSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white shadow p-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">POS</p>
          <h2 className="text-2xl font-bold">Punto de venta</h2>
          <p className="text-sm text-slate-500">Caja abierta: agrega productos y cobra.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-900 text-white px-4 py-3 shadow-lg shadow-slate-900/20 border border-slate-800">
            <span className="text-sm text-slate-200">Total</span>
            <div className="text-2xl font-extrabold">{money(total)}</div>
            <div className="text-xs text-slate-300">{cart.reduce((s, i) => s + i.cantidad, 0) + promoCart.reduce((s, i) => s + i.cantidad, 0)} ítems</div>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow hover:bg-slate-50"
          >
            Ver carrito
          </button>
          {user && user.rol !== 'superadmin' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="number"
                value={montoFinal}
                onChange={e => setMontoFinal(e.target.value)}
                placeholder="Monto final contado"
                className="w-full sm:w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
              <button
                onClick={solicitarCerrarCaja}
                disabled={closing}
                className="uppercase w-full sm:w-auto rounded-xl border border-rose-200 bg-rose-600 text-white px-4 py-2.5 text-sm font-semibold shadow hover:bg-rose-700 disabled:opacity-60"
              >
                {closing ? 'Cerrando...' : 'Cerrar caja'}
              </button>
              <button
                onClick={() => setRetiroModal(true)}
                className="w-full sm:w-auto rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100"
              >
                Retiro de caja
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        {!turno && (
          <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 shadow p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Turno requerido</div>
              <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-bold">Atención</span>
            </div>
            <p className="text-sm">Abre un turno desde Inicio para este local y luego vuelve al POS.</p>
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex items-center gap-2 rounded-full bg-slate-900/10 text-slate-800 font-semibold px-3 py-2 text-sm border border-slate-300" href="/inicio">Ir a Inicio para abrir turno</a>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Productos</p>
            {turnoLoading && <Skeleton className="h-4 w-28 rounded-full" />}
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                onClick={() => setCatModal(cat)}
              >
                {cat.nombre}
              </button>
            ))}
            {!categories.length && <span className="text-sm text-slate-500">Sin categorías</span>}
          </div>

          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            placeholder="Buscar producto"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {search && (
            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
              {filtered.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{p.nombre}</div>
                    <div className="text-sm text-slate-600">{money(p.precio)}</div>
                  </div>
                  <button
                    onClick={() => add(p)}
                    className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold shadow shadow-slate-900/20 hover:bg-slate-800"
                  >
                    Agregar
                  </button>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-sm text-slate-500">Sin resultados.</p>}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Promociones</p>
            <span className="text-xs text-slate-500">Agrega combos y descuentos</span>
          </div>

          <div className="grid md:grid-cols-2 gap-2">
            <label className="text-sm font-semibold text-slate-700 space-y-1">
              <span>Promoción</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                value={promoSelection.promocion_id}
                onChange={e => handleSelectPromo(e.target.value)}
              >
                <option value="">Selecciona</option>
                {promos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({money(p.precio_final)})</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700 space-y-1">
              <span>Cantidad</span>
              <input
                type="number"
                min={1}
                value={promoSelection.cantidad}
                onChange={e => setPromoSelection(prev => ({ ...prev, cantidad: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </label>
          </div>

          {promoSelection.items && promoSelection.items.length > 0 && (() => {
            const grouped = promoSelection.items.reduce((acc, it) => {
              acc[it.config_id] = acc[it.config_id] || [];
              acc[it.config_id].push(it);
              return acc;
            }, {});
            return (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-600">Selecciona productos para esta promo</p>
                {Object.values(grouped).map((items, groupIdx) => {
                  const reference = items[0];
                  const categoryName = categories.find(c => c.id === reference.categoria_id)?.nombre || 'Categoría';
                  const currentTotal = items.reduce((s, it) => s + Number(it.cantidad || 0), 0);
                  const maxText = reference.cantidad_max ? ` / máx ${reference.cantidad_max}` : '';
                  const puedeAgregar = reference.aplica_todos;
                  const botonDeshabilitado = reference.cantidad_max && reference.cantidad_max > 0 && currentTotal >= reference.cantidad_max;
                  return (
                    <div key={`${reference.config_id}-${groupIdx}`} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>{categoryName} (min {reference.cantidad_min || 1}{maxText})</span>
                        {puedeAgregar && (
                          <button
                            type="button"
                            className={`text-sky-700 ${botonDeshabilitado ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => addPromoProduct(reference.config_id)}
                            disabled={botonDeshabilitado}
                          >
                            Agregar otro
                          </button>
                        )}
                      </div>
                      {items.map((it, idx) => {
                        const globalIdx = promoSelection.items.findIndex(global => global === it);
                        return (
                          <div key={`${reference.config_id}-${idx}`} className="grid md:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                              value={it.producto_id}
                              onChange={e => updatePromoItem(globalIdx, 'producto_id', Number(e.target.value))}
                            >
                              <option value="">Elige producto</option>
                              {(productsByCategory[String(it.categoria_id)] || []).map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                              ))}
                            </select>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800"
                                onClick={() => updatePromoItem(globalIdx, 'cantidad', Math.max(1, Number(it.cantidad || 1) - 1))}
                              >
                                -
                              </button>
                              <span className="w-10 text-center text-sm font-semibold text-slate-900">{it.cantidad}</span>
                              <button
                                type="button"
                                className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 text-sm font-bold"
                                onClick={() => {
                                  const limite = reference.cantidad_max && reference.cantidad_max > 0 ? reference.cantidad_max : null;
                                  const nuevoTotal = currentTotal - Number(it.cantidad || 0) + (Number(it.cantidad || 0) + 1);
                                  if (limite && nuevoTotal > limite) {
                                    toast.error(`Máximo ${limite} para esta categoría`);
                                    return;
                                  }
                                  updatePromoItem(globalIdx, 'cantidad', Number(it.cantidad || 0) + 1);
                                }}
                              >
                                +
                              </button>
                            </div>
                            {items.length > 1 && (
                              <button
                                type="button"
                                className="text-xs text-red-600 font-semibold"
                                onClick={() => removePromoProduct(globalIdx)}
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <button
            type="button"
            onClick={addPromoToCart}
            className="w-full rounded-xl bg-emerald-600 text-white font-semibold px-4 py-2.5 shadow hover:bg-emerald-700"
          >
            Agregar promoción
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Cobro</p>
            <span className="text-sm font-bold text-slate-900">Total: {money(totalFinal)}</span>
          </div>
          <div className="text-sm text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>Ítems</span>
              <span>{cart.reduce((s, i) => s + i.cantidad, 0) + promoCart.reduce((s, i) => s + i.cantidad, 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{money(total)}</span>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
            {(cart.length === 0 && promoCart.length === 0) && (
              <p className="text-sm text-slate-500">Sin ítems</p>
            )}
            {cart.map(item => (
              <div key={`c-${item.producto_id}`} className="flex items-center justify-between text-sm text-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{item.nombre}</span>
                  <span className="text-slate-500">x{item.cantidad}</span>
                </div>
                <span className="font-semibold">{money(item.precio * item.cantidad)}</span>
              </div>
            ))}
            {promoCart.map((p, idx) => (
              <div key={`p-${idx}`} className="flex items-center justify-between text-sm text-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Promo: {p.nombre}</span>
                  <span className="text-slate-500">x{p.cantidad}</span>
                </div>
                <span className="font-semibold">{money((p.precio_final || 0) * p.cantidad)}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            disabled={cart.length === 0 && promoCart.length === 0}
            className="w-full rounded-xl bg-slate-900 text-white font-semibold px-4 py-3 shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
          >
            Abrir cobro / guardar
          </button>
        </div>
      </div>

      {retiroModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Caja</p>
                <h3 className="text-xl font-bold">Retiro de caja</h3>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setRetiroModal(false)} aria-label="Cerrar">
                <span>✕</span>
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Monto</span>
                <input
                  type="number"
                  value={retiroMonto}
                  onChange={e => setRetiroMonto(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Motivo (opcional)</span>
                <input
                  type="text"
                  value={retiroMotivo}
                  onChange={e => setRetiroMotivo(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  placeholder="Ej: depósito intermedio"
                  maxLength={120}
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRetiroModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={registrarRetiro}
                  disabled={retiroLoading}
                  className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow disabled:opacity-60"
                >
                  {retiroLoading ? 'Guardando...' : 'Registrar retiro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Pedidos del día</p>
            <h3 className="text-lg font-bold text-slate-900">Historial rápido</h3>
            <p className="text-xs text-slate-600">Cantidad de pedidos: {ventasFeed.length}</p>
          </div>
          <div className="flex items-center gap-2">
            {feedLoading && <Skeleton className="h-4 w-20 rounded-full" />}
            <button
              type="button"
              onClick={() => fetchVentasFeed(resolveLocal(), { current: false })}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Actualizar
            </button>
          </div>
        </div>
        {feedError && <div className="text-xs text-rose-600 font-semibold">{feedError}</div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 max-h-80 overflow-y-auto pr-1">
          {feedLoading && (
            <>
              {[1, 2, 3, 4].map(n => (
                <Skeleton key={n} className="h-32 w-full rounded-xl" />
              ))}
            </>
          )}
          {!feedLoading && ventasFeed.map(v => {
            const status = v.cobrado ? 'Cerrada' : (v.estado_cobro === 'parcial' ? 'Cobro parcial' : 'Pendiente');
            const statusClass = v.cobrado ? 'bg-emerald-100 text-emerald-800' : (v.estado_cobro === 'parcial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800');
            const resumenItems = [...(v.items || []), ...(v.promos || [])];
            const resumenText = resumenItems.slice(0, 2).map(it => `${it.nombre || 'Ítem'} x${it.cantidad || 1}`).join(' · ');
            const extras = Math.max(0, resumenItems.length - 2);
            return (
              <div key={v.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">#{v.id} · {v.cliente || 'Sin nombre'}</div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass}`}>{status}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{formatTime(v.fecha)}</span>
                  <span>{v.empleado || 'Sin empleado'}</span>
                </div>
                <div className="text-xs text-slate-600 line-clamp-2">{resumenText || 'Sin detalle'}{extras > 0 ? ` · +${extras} más` : ''}</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">{money(v.total)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      onClick={() => openVentaModal(v)}
                    >
                      Ver / Modificar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!feedLoading && !ventasFeed.length && (
            <div className="col-span-full text-sm text-slate-500">Sin pedidos registrados hoy.</div>
          )}
        </div>
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Carrito</p>
                <h3 className="text-xl font-bold text-slate-900">Productos y promociones</h3>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                onClick={() => setCartOpen(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Productos</p>
                {cart.length === 0 && <p className="text-sm text-slate-500">Sin productos</p>}
                {cart.map(item => (
                  <div key={item.producto_id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{item.nombre}</div>
                      <div className="text-sm text-slate-600">{money(item.precio)} x {item.cantidad}</div>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => changeQty(item.producto_id, -1)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold text-slate-900">{item.cantidad}</span>
                      <button
                        onClick={() => changeQty(item.producto_id, 1)}
                        className="rounded-lg bg-slate-900 text-white px-2.5 py-1.5 text-sm font-bold hover:bg-slate-800"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right font-semibold text-slate-900">{money(item.precio * item.cantidad)}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Promos</p>
                {promoCart.length === 0 && <p className="text-sm text-slate-500">Sin promociones</p>}
                {promoCart.map((p, idx) => (
                  <div key={`promo-cart-${idx}`} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-emerald-900">{p.nombre}</div>
                        <div className="text-xs text-emerald-800">{p.cantidad} x {money(p.precio_final)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-emerald-900">{money(p.cantidad * p.precio_final)}</div>
                        <button
                          type="button"
                          className="text-xs text-red-600 font-semibold"
                          onClick={() => removePromo(idx)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    {Array.isArray(p.items) && p.items.length > 0 && (
                      <div className="space-y-0.5">
                        {p.items.map((it, j) => {
                          const prod = productById.get(it.producto_id);
                          const label = prod ? prod.nombre : `Prod ${it.producto_id}`;
                          return (
                            <div key={`${idx}-${j}`} className="text-[11px] text-emerald-900 flex justify-between">
                              <span>{it.cantidad} x {label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm font-semibold text-slate-700">Ítems: {cart.reduce((s, i) => s + i.cantidad, 0) + promoCart.reduce((s, i) => s + i.cantidad, 0)}</div>
              <div className="text-lg font-bold text-slate-900">Total: {money(total)}</div>
            </div>
          </div>
        </div>
      )}

      {catModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Productos de {catModal.nombre}</h3>
              <button
                type="button"
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                onClick={() => setCatModal(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {products.filter(p => (p.categoria_ids || []).includes(catModal.id)).map(p => {
                const inCart = cart.find(c => c.producto_id === p.id);
                const qty = inCart ? inCart.cantidad : 0;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{p.nombre}</div>
                      <div className="text-sm text-slate-600">{money(p.precio)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => add(p)}
                        className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                      >
                        Agregar
                      </button>
                      <div className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-800">{qty} en carrito</div>
                      {qty > 0 && (
                        <button
                          type="button"
                          onClick={() => removeOne(p)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                        >
                          -1
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {products.filter(p => (p.categoria_ids || []).includes(catModal.id)).length === 0 && (
                <p className="text-sm text-slate-500">No hay productos en esta categoría</p>
              )}
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setCatModal(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Cobro</p>
                <h3 className="text-xl font-bold text-slate-900">Finalizar venta / pedido</h3>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                onClick={() => setCheckoutOpen(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>Subtotal</span>
                    <span>{money(total)}</span>
                  </div>
                  <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <span>Descuento (monto)</span>
                    <input
                      type="number"
                      className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={descuentoMonto}
                      min="0"
                      step="0.01"
                      onChange={e => setDescuentoMonto(e.target.value)}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <span>Descuento (%)</span>
                    <input
                      type="number"
                      className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={descuentoPorcentaje}
                      min="0"
                      step="0.01"
                      onChange={e => setDescuentoPorcentaje(e.target.value)}
                    />
                  </label>
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>Cupon</span>
                      <button type="button" className="text-xs text-sky-700" onClick={generarCupon}>Generar</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="w-28 rounded-xl border border-slate-200 px-2 py-2 text-sm"
                        placeholder="Código"
                        value={cuponCodigo}
                        onChange={e => setCuponCodigo(e.target.value)}
                      />
                      <input
                        type="number"
                        className="w-28 rounded-xl border border-slate-200 px-2 py-2 text-sm"
                        placeholder="$"
                        min="0"
                        step="0.01"
                        value={cuponMonto}
                        onChange={e => setCuponMonto(e.target.value)}
                      />
                    </div>
                  </div>
                  <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <span>Adicional manual</span>
                    <input
                      type="number"
                      className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={adicionalManual}
                      min="0"
                      step="0.01"
                      onChange={e => setAdicionalManual(e.target.value)}
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>Total final</span>
                    <span className="text-lg">{money(totalFinal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>Paga con</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={pagaCon}
                        min="0"
                        step="0.01"
                        onChange={e => setPagaCon(e.target.value)}
                      />
                      <button type="button" className="text-xs text-sky-700" onClick={autofillPagoConTotal}>Usar total</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>Vuelto</span>
                    <span>{money(vueltoCalculado)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Cobrado</span>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <input type="checkbox" checked={cobrado} onChange={e => setCobrado(e.target.checked)} />
                      <span>{cobrado ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <label className="flex flex-col text-sm font-semibold text-slate-900 gap-1">
                    <span>Empleado (opcional)</span>
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={empleadoId}
                      onChange={e => setEmpleadoId(e.target.value)}
                    >
                      <option value="">Sin asignar</option>
                      {empleados.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col text-sm font-semibold text-slate-900 gap-1">
                    <span>Observaciones</span>
                    <input
                      type="text"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={observaciones}
                      onChange={e => setObservaciones(e.target.value)}
                      placeholder="Opcional"
                      maxLength={180}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>Cliente (opcional)</span>
                    <button type="button" className="text-xs text-sky-700" onClick={() => setClient(null)}>Limpiar</button>
                  </div>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={client || ''}
                    onChange={e => setClient(e.target.value || null)}
                  >
                    <option value="">Sin cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre || `Cliente ${c.id}`}</option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900 pt-2">
                    <span>Formas de pago</span>
                    <button type="button" className="text-xs text-sky-700" onClick={addPaymentLine} disabled={!cobrado}>Agregar</button>
                  </div>
                {paymentLines.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={p.metodo_id}
                      onChange={e => updatePaymentLine(idx, 'metodo_id', e.target.value)}
                      disabled={!cobrado}
                    >
                      <option value="">Método</option>
                      {paymentMethods.map(mp => (
                        <option key={mp.id} value={mp.id}>{mp.nombre}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={p.monto}
                      min="0"
                      step="0.01"
                      onChange={e => updatePaymentLine(idx, 'monto', e.target.value)}
                      disabled={!cobrado}
                    />
                    {paymentLines.length > 1 && (
                      <button type="button" className="text-xs text-red-600 font-semibold" onClick={() => removePaymentLine(idx)} disabled={!cobrado}>Quitar</button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                  <span>Total pagos</span>
                  <span>{money(totalPagos)}</span>
                </div>
                {cobrado && faltante > 0 && (
                  <div className="text-xs text-red-600 font-semibold">Faltan {money(faltante)} para completar el cobro.</div>
                )}

                <button
                  onClick={() => { checkout(); setCheckoutOpen(false); }}
                  disabled={(cart.length === 0 && promoCart.length === 0) || (cobrado && faltante > 0.02)}
                  className="w-full rounded-xl bg-slate-900 text-white font-semibold px-4 py-3 shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {cobrado ? 'Cobrar' : 'Guardar pedido sin cobrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmCerrarCaja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-tight text-rose-600 font-semibold">Cerrar caja</p>
              <h3 className="text-lg font-bold text-slate-900">¿Estás seguro que deseas cerrar la caja ahora?</h3>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                onClick={() => setConfirmCerrarCaja(false)}
                disabled={closing}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-rose-700 disabled:opacity-60"
                onClick={cerrarCaja}
                disabled={closing}
              >
                {closing ? 'Cerrando...' : 'Cerrar caja ahora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ventaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-tight text-slate-500 font-semibold">Detalle de venta</p>
                <h3 className="text-xl font-bold text-slate-900">#{ventaModal.id} · {ventaModal.cliente || 'Sin nombre'}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>{formatTime(ventaModal.fecha)}</span>
                  <span>·</span>
                  <span>{ventaModal.empleado || 'Sin empleado'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ventaModal.cobrado ? 'bg-emerald-100 text-emerald-800' : (ventaModal.estado_cobro === 'parcial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}`}>
                  {ventaModal.cobrado ? 'Cerrada' : (ventaModal.estado_cobro === 'parcial' ? 'Cobro parcial' : 'Pendiente')}
                </span>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                  onClick={() => { setVentaModal(null); setVentaEdit(null); }}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="text-sm font-semibold text-slate-900">Items</div>
                  {(ventaModal.items || []).length === 0 && <p className="text-sm text-slate-500">Sin productos</p>}
                  {(ventaModal.items || []).map((it, idx) => (
                    <div key={`i-${idx}`} className="flex items-center justify-between text-sm text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{it.nombre || 'Producto'}</span>
                        <span className="text-slate-500">x{it.cantidad}</span>
                      </div>
                      <span className="font-semibold">{money(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="text-sm font-semibold text-slate-900">Promos</div>
                  {(ventaModal.promos || []).length === 0 && <p className="text-sm text-slate-500">Sin promos</p>}
                  {(ventaModal.promos || []).map((p, idx) => (
                    <div key={`p-${idx}`} className="flex items-center justify-between text-sm text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.nombre || 'Promo'}</span>
                        <span className="text-slate-500">x{p.cantidad}</span>
                      </div>
                      <span className="font-semibold">{money(p.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>Total</span>
                    <span>{money(ventaModal.total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>Pagado</span>
                    <span>{money(totalPagosEdit)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>Saldo pendiente</span>
                    <span>{money(Math.max(0, num(ventaModal.total) - totalPagosEdit))}</span>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Cobrado</span>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <input
                        type="checkbox"
                        checked={ventaEdit?.cobrado || false}
                        onChange={e => setVentaEdit(prev => ({ ...prev, cobrado: e.target.checked }))}
                        disabled={ventaModal.cobrado}
                      />
                      <span>{ventaEdit?.cobrado ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <span>Paga con</span>
                    <input
                      type="number"
                      className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={ventaEdit?.paga_con ?? ''}
                      onChange={e => setVentaEdit(prev => ({ ...prev, paga_con: e.target.value }))}
                      disabled={ventaModal.cobrado}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                    <span>Vuelto</span>
                    <input
                      type="number"
                      className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={ventaEdit?.vuelto ?? ''}
                      onChange={e => setVentaEdit(prev => ({ ...prev, vuelto: e.target.value }))}
                      disabled={ventaModal.cobrado}
                    />
                  </label>
                  <label className="flex flex-col text-sm font-semibold text-slate-900 gap-1">
                    <span>Empleado (opcional)</span>
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={ventaEdit?.empleado_id || ''}
                      onChange={e => setVentaEdit(prev => ({ ...prev, empleado_id: e.target.value }))}
                      disabled={ventaModal.cobrado}
                    >
                      <option value="">Sin asignar</option>
                      {empleados.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col text-sm font-semibold text-slate-900 gap-1">
                    <span>Observaciones</span>
                    <input
                      type="text"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={ventaEdit?.observaciones || ''}
                      onChange={e => setVentaEdit(prev => ({ ...prev, observaciones: e.target.value }))}
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>Pagos</span>
                    <button type="button" className="text-xs text-sky-700" onClick={addVentaPago} disabled={ventaModal.cobrado}>Agregar</button>
                  </div>
                  {(ventaEdit?.pagos || []).map((p, idx) => (
                    <div key={`pay-${idx}`} className="flex items-center gap-2">
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={p.metodo_id}
                        onChange={e => updateVentaPago(idx, 'metodo_id', e.target.value)}
                        disabled={ventaModal.cobrado}
                      >
                        <option value="">Método</option>
                        {paymentMethods.map(mp => (
                          <option key={mp.id} value={mp.id}>{mp.nombre}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={p.monto}
                        min="0"
                        step="0.01"
                        onChange={e => updateVentaPago(idx, 'monto', e.target.value)}
                        disabled={ventaModal.cobrado}
                      />
                      {(ventaEdit?.pagos || []).length > 1 && (
                        <button type="button" className="text-xs text-red-600 font-semibold" onClick={() => removeVentaPago(idx)} disabled={ventaModal.cobrado}>Quitar</button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>Total pagos</span>
                    <span>{money(totalPagosEdit)}</span>
                  </div>
                  {ventaEditError && <div className="text-xs text-rose-600 font-semibold">{ventaEditError}</div>}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {user?.rol === 'admin' && (
                    <button
                      type="button"
                      onClick={() => anularVenta(ventaModal.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Anular venta
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={guardarVentaEdit}
                    disabled={ventaSaving || ventaModal.cobrado}
                    className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold shadow shadow-slate-900/20 disabled:opacity-60"
                  >
                    {ventaSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVentaModal(null); setVentaEdit(null); }}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
