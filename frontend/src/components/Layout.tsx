import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const Layout = () => (
  <div className="flex min-h-screen bg-[#f7f9fc] text-slate-900">
    <div className="w-64 border-r border-slate-200 bg-white/90 backdrop-blur">
      <Sidebar />
    </div>
    <main className="flex-1 bg-transparent p-8">
      <Outlet />
    </main>
  </div>
);
