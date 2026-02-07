import React from 'react';
import AdminUsers from './AdminUsers';
import PaymentMethods from './PaymentMethods';
import ProductsManager from './ProductsManager';
import CategoriesManager from './CategoriesManager';
import { useState } from 'react';

export default function AdminPanel() {
  const [catVersion, setCatVersion] = useState(0);

  function bumpCats() {
    setCatVersion(v => v + 1);
  }

  // Aquí puedes agregar más widgets según los permisos del admin
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2>Panel de Administración del Negocio</h2>
      <ul>
        <li>Gestión de usuarios del negocio</li>
        <li>Reportes de ventas y caja</li>
        <li>Gestión de productos y stock</li>
        <li>Configuración de locales y turnos</li>
        <li>Acceso a reportes avanzados</li>
      </ul>
      <p>Este panel es visible solo para usuarios con rol <b>admin</b> del negocio.</p>
      <AdminUsers />
      <CategoriesManager onChange={bumpCats} />
      <ProductsManager catVersion={catVersion} />
      <PaymentMethods />
    </div>
  );
}
