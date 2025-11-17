import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
export const Layout = () => (_jsxs("div", { className: "flex min-h-screen bg-[#f7f9fc] text-slate-900", children: [_jsx("div", { className: "w-64 border-r border-slate-200 bg-white/90 backdrop-blur", children: _jsx(Sidebar, {}) }), _jsx("main", { className: "flex-1 bg-transparent p-8", children: _jsx(Outlet, {}) })] }));
