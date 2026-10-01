import { Outlet } from 'react-router-dom';

import AdminSidebar from '../components/admin/AdminSidebar';

export default function AdminLayout() {
  return (
    <main className="adminPage">
      <AdminSidebar />

      <Outlet />
    </main>
  );
}