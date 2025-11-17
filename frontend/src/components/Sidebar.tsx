import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/new-test', label: 'Nueva Prueba' },
  { to: '/history', label: 'Historial' },
  { to: '/settings', label: 'Configuración' },
  { to: '/help', label: 'Ayuda' }
];

export const Sidebar = () => (
  <aside className="flex h-full flex-col justify-between bg-white/95 p-6 shadow-lg">
    <div>
      <p className="text-lg font-semibold text-slate-900">Network Lab</p>
      <p className="text-xs text-slate-500">Laboratorio Redes I</p>
      <nav className="mt-8 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'block rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sky-100 text-sky-700 shadow-inner'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
    <div className="text-xs text-slate-500">
      <p>U2025 - Proyecto final</p>
      <p>3 estudiantes remotos</p>
    </div>
  </aside>
);
