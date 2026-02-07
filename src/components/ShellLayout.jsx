import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NowBar from './NowBar';
import { FiActivity, FiHome, FiShoppingBag, FiSettings, FiStar, FiChevronDown, FiMenu, FiX, FiChevronLeft, FiTruck, FiClipboard, FiBookOpen, FiLayers, FiUsers, FiBarChart2, FiMoon, FiSun, FiMonitor } from 'react-icons/fi';

export default function ShellLayout({ children, onLogout }) {
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const [configOpen, setConfigOpen] = useState(location.pathname.startsWith('/config'));
  const [ventasOpen, setVentasOpen] = useState(location.pathname.startsWith('/pos') || location.pathname.startsWith('/caja') || location.pathname.startsWith('/config/promociones'));
  const [rrhhOpen, setRrhhOpen] = useState(location.pathname.startsWith('/config/empleados'));
  const [reportesOpen, setReportesOpen] = useState(location.pathname.startsWith('/config/reportes'));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const links = [
    { to: '/inicio', label: 'Inicio', icon: <FiHome />, permissions: ['dashboard:read', 'dashboard:caja-card', 'dashboard:alertas-card', 'dashboard:kpis'] },
    { to: '/mi-suscripcion', label: 'Mi suscripción', icon: <FiActivity />, permissions: ['subscription:read'] },
    { to: '/caja', label: 'Caja', icon: <FiBookOpen />, permissions: ['caja:read'] },
    { to: '/compras', label: 'Compras', icon: <FiClipboard />, permissions: ['compras:read'] },
    { to: '/novedades', label: 'Novedades', icon: <FiStar />, roles: ['admin', 'superadmin'] },
    { to: '/proveedores', label: 'Proveedores', icon: <FiTruck />, permissions: ['proveedores:read'] },
    { to: '/admin', label: 'Superadmin', icon: <FiStar />, roles: ['superadmin'] },
    { to: '/admin/planes', label: 'Planes SaaS', icon: <FiActivity />, roles: ['superadmin'] },
    { to: '/admin/suscripciones', label: 'Suscripciones', icon: <FiLayers />, roles: ['superadmin'] },
  ];

  const ventasLinks = [
    { to: '/pos', label: 'POS', icon: <FiShoppingBag />, permissions: ['pos:read'] },
    { to: '/caja', label: 'Historial de caja', icon: <FiBookOpen />, permissions: ['caja:read'] },
    { to: '/config/promociones', label: 'Promociones', icon: <FiStar />, permissions: ['promociones:read'] },
  ];

  const configLinks = [
    { to: '/config', label: 'Resumen', permissions: ['usuarios:read'] },
    { to: '/config/productos', label: 'Productos', permissions: ['productos:read', 'productos:ajuste'] },
    { to: '/config/categorias', label: 'Categorías', permissions: ['categorias:read'] },
    { to: '/config/clientes', label: 'Clientes', permissions: ['clientes:read'] },
    { to: '/config/metodos-pago', label: 'Métodos de pago', permissions: ['metodos-pago:read'] },
    { to: '/config/usuarios', label: 'Usuarios', permissions: ['usuarios:read'] },
    { to: '/config/proveedores', label: 'Proveedores', permissions: ['proveedores:read'] },
  ];

  const rrhhLinks = [
    { to: '/config/empleados', label: 'Empleados', permissions: ['empleados:read'] },
  ];

  const reportesLinks = [
    { to: '/config/reportes-cierre', label: 'Reportes de cierre', permissions: ['reportes:cierre'] },
    { to: '/config/reportes-ventas', label: 'Ventas por período', permissions: ['reportes:ventas'] },
    { to: '/config/reportes-clientes', label: 'Ventas por cliente', permissions: ['reportes:ventas-cliente'] },
    { to: '/config/reportes-productos-cliente', label: 'Producto por cliente', permissions: ['reportes:productos-cliente'] },
    { to: '/config/reportes-promociones', label: 'Promos más vendidas', permissions: ['reportes:promociones'] },
    { to: '/config/reportes-promociones-clientes', label: 'Clientes con promos', permissions: ['reportes:promociones-clientes'] },
    { to: '/config/reportes-caja', label: 'Caja por turnos', permissions: ['reportes:caja'] },
    { to: '/config/reportes-stock', label: 'Reporte Stock', permissions: ['reportes:stock'] },
    { to: '/config/reportes-stock-ajustes', label: 'Ajustes de stock', permissions: ['reportes:stock-ajustes'] },
  ];

  useEffect(() => {
    if (location.pathname.startsWith('/config')) setConfigOpen(true);
    if (location.pathname.startsWith('/config/empleados')) setRrhhOpen(true);
    if (location.pathname.startsWith('/config/reportes')) setReportesOpen(true);
    if (ventasLinks.some(v => location.pathname.startsWith(v.to))) setVentasOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const baseLink = 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors';
  const defaultLink = `${baseLink} text-slate-200 hover:bg-white/10`;
  const activeLink = `${baseLink} bg-sky-500 text-slate-900 shadow`;

  const sidebarWidth = useMemo(() => (collapsed ? '5rem' : '16rem'), [collapsed]);
  const themeCycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const themeLabel = theme === 'system' ? `Auto (${resolvedTheme})` : theme === 'dark' ? 'Oscuro' : 'Claro';
  const themeIcon = theme === 'system' ? <FiMonitor /> : theme === 'dark' ? <FiMoon /> : <FiSun />;

  const perms = user?.permissions || user?.permisos || [];
  const hasPerm = (perm) => user?.rol === 'superadmin' || perms.includes(perm);
  const hasAnyPerm = (permList = []) => permList.some(hasPerm);
  const canAccess = (link) => {
    // Superadmin solo ve opciones SaaS
    if (user?.rol === 'superadmin') {
      // Siempre mostrar links con roles: ['superadmin'] aunque no tenga permisos
      return link.roles && link.roles.includes('superadmin');
    }
    if (link.roles && (!user || !link.roles.includes(user.rol))) return false;
    if (link.permissions && !hasAnyPerm(link.permissions)) return false;
    return true;
  };
  // Superadmin no debe ver submenús de negocio
  const isSuperadmin = user?.rol === 'superadmin';
  const hasVentasAccess = !isSuperadmin && ventasLinks.some(canAccess);
  const hasConfigAccess = !isSuperadmin && configLinks.some(canAccess);
  const hasRrhhAccess = !isSuperadmin && rrhhLinks.some(canAccess);
  const hasReportesAccess = !isSuperadmin && reportesLinks.some(canAccess);

  function renderNav(labelVisible = true, onNavigate) {
    return (
      <>
        {links
          .filter(canAccess)
          .map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => onNavigate && onNavigate()}
              className={({ isActive }) => isActive ? activeLink : defaultLink}
            >
              <span className="text-lg">{link.icon}</span>
              {labelVisible && link.label}
            </NavLink>
          ))}

        {hasVentasAccess && (
          <div className="space-y-1">
            <button
              type="button"
              className={`${defaultLink} w-full justify-between`}
              onClick={() => setVentasOpen(v => !v)}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg"><FiShoppingBag /></span>
                {labelVisible && <span>Ventas</span>}
              </span>
              {labelVisible && <FiChevronDown className={`transition-transform ${ventasOpen ? 'rotate-180' : ''}`} />}
            </button>
            {ventasOpen && labelVisible && (
              <div className="pl-4 space-y-1">
                {ventasLinks.filter(canAccess).map(sub => (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    onClick={() => onNavigate && onNavigate()}
                    className={({ isActive }) =>
                      isActive
                        ? `${activeLink} text-sm`
                        : `${defaultLink} text-sm text-slate-300`
                    }
                  >
                    <span className="text-base">{sub.icon}</span>
                    <span>{sub.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {hasConfigAccess && (
          <div className="space-y-1">
            <button
              type="button"
              className={`${defaultLink} w-full justify-between`}
              onClick={() => setConfigOpen(v => !v)}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg"><FiSettings /></span>
                {labelVisible && <span>Configuración</span>}
              </span>
              {labelVisible && <FiChevronDown className={`transition-transform ${configOpen ? 'rotate-180' : ''}`} />}
            </button>
            {configOpen && labelVisible && (
              <div className="pl-4 space-y-1">
                {configLinks.filter(canAccess).map(sub => (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    onClick={() => onNavigate && onNavigate()}
                    className={({ isActive }) =>
                      isActive
                        ? `${activeLink} text-sm`
                        : `${defaultLink} text-sm text-slate-300`
                    }
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {hasRrhhAccess && (
          <div className="space-y-1">
            <button
              type="button"
              className={`${defaultLink} w-full justify-between`}
              onClick={() => setRrhhOpen(v => !v)}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg"><FiUsers /></span>
                {labelVisible && <span>Recursos humanos</span>}
              </span>
              {labelVisible && <FiChevronDown className={`transition-transform ${rrhhOpen ? 'rotate-180' : ''}`} />}
            </button>
            {rrhhOpen && labelVisible && (
              <div className="pl-4 space-y-1">
                {rrhhLinks.filter(canAccess).map(sub => (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    onClick={() => onNavigate && onNavigate()}
                    className={({ isActive }) =>
                      isActive
                        ? `${activeLink} text-sm`
                        : `${defaultLink} text-sm text-slate-300`
                    }
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {hasReportesAccess && (
          <div className="space-y-1">
            <button
              type="button"
              className={`${defaultLink} w-full justify-between`}
              onClick={() => setReportesOpen(v => !v)}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg"><FiBarChart2 /></span>
                {labelVisible && <span>Reportes</span>}
              </span>
              {labelVisible && <FiChevronDown className={`transition-transform ${reportesOpen ? 'rotate-180' : ''}`} />}
            </button>
            {reportesOpen && labelVisible && (
              <div className="pl-4 space-y-1">
                {reportesLinks.filter(canAccess).map(sub => (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    onClick={() => onNavigate && onNavigate()}
                    className={({ isActive }) =>
                      isActive
                        ? `${activeLink} text-sm`
                        : `${defaultLink} text-sm text-slate-300`
                    }
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 ${collapsed ? 'w-20' : 'w-64'} flex-col bg-slate-950 text-slate-50 border-r border-slate-900/60 shadow-xl transition-all duration-200`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            {!collapsed && (
              <div>
                <div className="text-lg font-extrabold leading-tight">Control Stock</div>
                <p className="text-[11px] text-slate-400">Panel</p>
              </div>
            )}
            </div>
          </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 text-slate-100 px-3 py-2 text-xs font-semibold hover:bg-white/10"
            onClick={themeCycle}
            title={`Tema: ${themeLabel}`}
          >
            <span className="text-base">{themeIcon}</span>
            {!collapsed && <span>{themeLabel}</span>}
          </button>
          <button
            className="hidden md:inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 p-2 hover:bg-white/10"
            onClick={() => setCollapsed(v => !v)}
            aria-label="Contraer barra lateral"
          >
            <FiChevronLeft className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {renderNav(!collapsed)}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 space-y-2">
          {!collapsed && (
            <div className="rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 truncate">
              {user?.nombre || user?.email || 'Usuario'}
            </div>
          )}
          <button
            className="w-full rounded-xl bg-white/10 text-white font-bold py-2.5 hover:bg-white/20 transition"
            onClick={onLogout}
          >
            {collapsed ? 'Salir' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed inset-x-0 top-0 z-30 bg-slate-950 text-slate-50 px-4 py-3 shadow-lg flex items-center justify-between">
        <button
          className="inline-flex items-center justify-center p-2 rounded-lg bg-white/10 text-slate-50"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <FiMenu />
        </button>
        <div className="text-lg font-bold">Control Stock</div>
        <div className="w-10" />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-72 max-w-full bg-slate-950 text-slate-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <div className="text-lg font-bold">Control Stock</div>
              <button
                className="inline-flex items-center justify-center p-2 rounded-lg bg-white/10 text-slate-50"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
              >
                <FiX />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
              {renderNav(true, () => setMobileOpen(false))}
            </nav>
            <div className="px-4 py-4 border-t border-white/10 space-y-2">
              <div className="rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 truncate">
                {user?.nombre || user?.email || 'Usuario'}
              </div>
              <button
                className="w-full rounded-xl bg-white/10 text-white font-bold py-2.5 hover:bg-white/20 transition"
                onClick={onLogout}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
          <button
            className="flex-1 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      <main
        className="flex-1 min-h-screen flex flex-col md:ml-0"
        style={{ marginLeft: isDesktop ? sidebarWidth : 0 }}
      >
        <div className="md:ml-0 w-full px-3 md:px-6 pt-16 md:pt-6 pb-6">
          <div className="hidden md:block">
            <NowBar />
          </div>
          <div className="mt-2">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
