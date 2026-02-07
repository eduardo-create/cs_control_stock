import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ element, roles = [], permissions = [], redirectTo = '/login' }) {
  const { user, token, loading } = useAuth();

  if (loading) return null;

  if (!user || !token) {
    return <Navigate to={redirectTo} replace />;
  }


  // Bloquear acceso a rutas de negocio para superadmin
  if (user?.rol === 'superadmin') {
    // Solo permitir rutas que explícitamente incluyan roles: ['superadmin']
    if (!roles || !roles.includes('superadmin')) {
      return <Navigate to={redirectTo} replace />;
    }
    // Si la ruta es para superadmin, permitir
    return element;
  }

  if (roles.length > 0 && !roles.includes(user.rol)) {
    return <Navigate to={redirectTo} replace />;
  }

  if (permissions.length > 0) {
    const perms = user?.permissions || user?.permisos || [];
    const hasPerm = permissions.some(p => perms.includes(p));
    if (!hasPerm) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return element;
}
