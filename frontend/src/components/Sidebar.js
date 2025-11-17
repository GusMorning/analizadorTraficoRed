import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/new-test', label: 'Nueva Prueba' },
    { to: '/history', label: 'Historial' },
    { to: '/settings', label: 'Configuración' },
    { to: '/help', label: 'Ayuda' }
];
export const Sidebar = () => (_jsxs("aside", { className: "flex h-full flex-col justify-between bg-white/95 p-6 shadow-lg", children: [_jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold text-slate-900", children: "Network Lab" }), _jsx("p", { className: "text-xs text-slate-500", children: "Laboratorio Redes I" }), _jsx("nav", { className: "mt-8 space-y-2", children: navItems.map((item) => (_jsx(NavLink, { to: item.to, className: ({ isActive }) => clsx('block rounded-xl px-3 py-2 text-sm font-medium transition-colors', isActive
                            ? 'bg-sky-100 text-sky-700 shadow-inner'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'), children: item.label }, item.to))) })] }), _jsxs("div", { className: "text-xs text-slate-500", children: [_jsx("p", { children: "U2025 - Proyecto final" }), _jsx("p", { children: "3 estudiantes remotos" })] })] }));
