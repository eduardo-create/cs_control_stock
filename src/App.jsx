
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import POS from './components/POS';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import SuperadminPanel from './components/SuperadminPanel';
import DashboardHome from './components/DashboardHome';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import ShellLayout from './components/ShellLayout';
import ConfigHome from './components/ConfigHome';
import ConfigProductos from './components/ConfigProductos';
import ConfigCategorias from './components/ConfigCategorias';
import ConfigMetodos from './components/ConfigMetodos';
import ConfigUsuarios from './components/ConfigUsuarios';
import ConfigPromociones from './components/ConfigPromociones';
import ProveedoresPage from './components/ProveedoresPage';
import ComprasPage from './components/ComprasPage';
import NovedadesPage from './components/NovedadesPage';
import CajaHistorial from './components/CajaHistorial';
import CajaDetalle from './components/CajaDetalle';
import AdminPlanes from './components/AdminPlanes';
import AdminSuscripciones from './components/AdminSuscripciones';
import EmpleadosPage from './components/EmpleadosPage';
import ReporteCierrePage from './components/ReporteCierrePage';
import ReporteVentasPeriodoPage from './components/ReporteVentasPeriodoPage';
import ReporteCajaPage from './components/ReporteCajaPage';
import ReporteStockPage from './components/ReporteStockPage';
import ReporteAjustesStockPage from './components/ReporteAjustesStockPage';
import MiSuscripcion from './components/MiSuscripcion';
import ClientesPage from './components/ClientesPage';
import ReporteVentasClientePage from './components/ReporteVentasClientePage';
import ReporteProductosClientePage from './components/ReporteProductosClientePage';
import ReportePromosPage from './components/ReportePromosPage';
import ReporteClientesPromosPage from './components/ReporteClientesPromosPage';

function AppRoutes() {
  const { user, token, logout } = useAuth();

  const wrap = (node) => <ShellLayout onLogout={logout}>{node}</ShellLayout>;

  // Si el usuario es superadmin y no está en /admin, /admin/planes o /admin/suscripciones, redirigirlo automáticamente
  if (user?.rol === 'superadmin') {
    const allowed = ['/admin', '/admin/planes', '/admin/suscripciones'];
    const current = window.location.pathname;
    if (!allowed.some(path => current.startsWith(path))) {
      window.location.replace('/admin');
      return null;
    }
  }

  return (
    <BrowserRouter>
      <div>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/login"
            element={token ? <Navigate to="/inicio" /> : <Login />}
          />
          <Route path="/onboarding" element={<Onboarding />} />

          <Route
            path="/inicio"
            element={
              <ProtectedRoute
                element={wrap(<DashboardHome />)}
                permissions={['dashboard:read', 'dashboard:caja-card', 'dashboard:alertas-card', 'dashboard:kpis']}
                redirectTo={token ? '/login' : '/login'}
              />
            }
          />

          <Route
            path="/pos"
            element={
              <ProtectedRoute
                element={wrap(<POS />)}
                permissions={['pos:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/caja"
            element={
              <ProtectedRoute
                element={wrap(<CajaHistorial />)}
                permissions={['caja:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/caja/:turnoId"
            element={
              <ProtectedRoute
                element={wrap(<CajaDetalle />)}
                permissions={['caja:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/compras"
            element={
              <ProtectedRoute
                element={wrap(<ComprasPage />)}
                permissions={['compras:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/novedades"
            element={
              <ProtectedRoute
                element={wrap(<NovedadesPage />)}
                roles={['admin', 'superadmin']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config"
            element={
              <ProtectedRoute
                element={wrap(<ConfigHome />)}
                permissions={['usuarios:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/mi-suscripcion"
            element={
              <ProtectedRoute
                element={wrap(<MiSuscripcion />)}
                permissions={['subscription:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />
          <Route
            path="/config/productos"
            element={
              <ProtectedRoute
                element={wrap(<ConfigProductos />)}
                permissions={['productos:read', 'productos:ajuste']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />
          <Route
            path="/config/categorias"
            element={
              <ProtectedRoute
                element={wrap(<ConfigCategorias />)}
                permissions={['categorias:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />
          <Route
            path="/config/metodos-pago"
            element={
              <ProtectedRoute
                element={wrap(<ConfigMetodos />)}
                permissions={['metodos-pago:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />
          <Route
            path="/config/clientes"
            element={
              <ProtectedRoute
                element={wrap(<ClientesPage />)}
                permissions={['clientes:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />
          <Route
            path="/config/usuarios"
            element={
              <ProtectedRoute
                element={wrap(<ConfigUsuarios />)}
                permissions={['usuarios:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/promociones"
            element={
              <ProtectedRoute
                element={wrap(<ConfigPromociones />)}
                permissions={['promociones:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/proveedores"
            element={
              <ProtectedRoute
                element={wrap(<ProveedoresPage />)}
                permissions={['proveedores:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/empleados"
            element={
              <ProtectedRoute
                element={wrap(<EmpleadosPage />)}
                permissions={['empleados:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/reportes-cierre"
            element={
              <ProtectedRoute
                element={wrap(<ReporteCierrePage />)}
                permissions={['reportes:cierre']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/reportes-ventas"
            element={
              <ProtectedRoute
                element={wrap(<ReporteVentasPeriodoPage />)}
                permissions={['reportes:ventas']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />
          <Route
            path="/config/reportes-clientes"
            element={
              <ProtectedRoute
                element={wrap(<ReporteVentasClientePage />)}
                permissions={['reportes:ventas-cliente']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/reportes-productos-cliente"
            element={
              <ProtectedRoute
                element={wrap(<ReporteProductosClientePage />)}
                permissions={['reportes:productos-cliente']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/reportes-promociones"
            element={
              <ProtectedRoute
                element={wrap(<ReportePromosPage />)}
                permissions={['reportes:promociones']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/reportes-promociones-clientes"
            element={
              <ProtectedRoute
                element={wrap(<ReporteClientesPromosPage />)}
                permissions={['reportes:promociones-clientes']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/reportes-caja"
            element={
              <ProtectedRoute
                element={wrap(<ReporteCajaPage />)}
                permissions={['reportes:caja']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/reportes-stock"
            element={
              <ProtectedRoute
                element={wrap(<ReporteStockPage />)}
                permissions={['reportes:stock']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/config/reportes-stock-ajustes"
            element={
              <ProtectedRoute
                element={wrap(<ReporteAjustesStockPage />)}
                permissions={['reportes:stock-ajustes']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/proveedores"
            element={
              <ProtectedRoute
                element={wrap(<ProveedoresPage />)}
                permissions={['proveedores:read']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute
                element={wrap(<SuperadminPanel />)}
                roles={['superadmin']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />
          <Route
            path="/admin/planes"
            element={
              <ProtectedRoute
                element={wrap(<AdminPlanes />)}
                roles={['superadmin']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />
          <Route
            path="/admin/suscripciones"
            element={
              <ProtectedRoute
                element={wrap(<AdminSuscripciones />)}
                roles={['superadmin']}
                redirectTo={token ? '/inicio' : '/login'}
              />
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: '12px', background: '#0f172a', color: '#fff', fontWeight: 600 } }} />
      </AuthProvider>
    </ThemeProvider>
  );
}
