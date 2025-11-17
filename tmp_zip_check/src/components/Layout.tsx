import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const Layout = () => (
  <div className="flex min-h-screen bg-slate-900 text-white">
    <div className="w-64 border-r border-slate-800">
      <Sidebar />
    </div>
    <main className="flex-1 bg-slate-900/70 p-8">
      <Outlet />
    </main>
  </div>
);
