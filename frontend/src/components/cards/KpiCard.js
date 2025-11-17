import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const colors = {
    green: 'text-emerald-600',
    blue: 'text-sky-600',
    orange: 'text-amber-600'
};
export const KpiCard = ({ title, value, sublabel, accent = 'blue' }) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-lg", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: title }), _jsx("p", { className: `mt-2 text-3xl font-semibold ${colors[accent]}`, children: value }), sublabel && _jsx("p", { className: "mt-1 text-xs text-slate-500", children: sublabel })] }));
