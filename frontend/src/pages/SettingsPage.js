import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
const SettingsPage = () => {
    const { settings, updateSettings } = useSettings();
    const [form, setForm] = useState(settings);
    const [status, setStatus] = useState(null);
    useEffect(() => {
        setForm(settings);
    }, [settings]);
    const handleSubmit = (event) => {
        event.preventDefault();
        updateSettings(form);
        setStatus('Configuración guardada.');
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-semibold", children: "Configuraci\u00F3n" }), _jsx("p", { className: "text-sm text-slate-400", children: "Define los endpoints para ejecutar el laboratorio desde casa." })] }), _jsxs("form", { className: "grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6", onSubmit: handleSubmit, children: [_jsxs("label", { className: "text-sm text-slate-400", children: ["URL base de la API (ej. http://localhost:4000/api)", _jsx("input", { className: "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white", value: form.apiBaseUrl, onChange: (event) => setForm({ ...form, apiBaseUrl: event.target.value }) })] }), _jsxs("label", { className: "text-sm text-slate-400", children: ["URL del WebSocket (ej. http://localhost:4000)", _jsx("input", { className: "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white", value: form.wsUrl, onChange: (event) => setForm({ ...form, wsUrl: event.target.value }) })] }), _jsxs("label", { className: "text-sm text-slate-400", children: ["Path del WebSocket (por defecto /ws)", _jsx("input", { className: "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white", value: form.wsPath, onChange: (event) => setForm({ ...form, wsPath: event.target.value }) })] }), _jsxs("label", { className: "text-sm text-slate-400", children: ["URL de CellMapper (embed)", _jsx("input", { className: "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white", value: form.cellMapperUrl, onChange: (event) => setForm({ ...form, cellMapperUrl: event.target.value }), placeholder: "https://www.cellmapper.net/map?..." }), _jsx("p", { className: "mt-1 text-xs text-slate-500", children: "Abre CellMapper, ajusta MCC/MNC y zoom, luego pega la URL para verla integrada en el dashboard." })] }), _jsx("button", { type: "submit", className: "rounded-lg bg-sky-500 px-6 py-2 text-sm font-semibold text-slate-950", children: "Guardar cambios" }), status && _jsx("p", { className: "text-xs text-slate-500", children: status })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300", children: [_jsx("p", { className: "font-semibold text-white", children: "Recordatorio Wireshark" }), _jsxs("ul", { className: "mt-3 list-disc space-y-1 pl-5 text-xs text-slate-400", children: [_jsxs("li", { children: ["UDP (eco): usa el filtro ", _jsx("code", { className: "rounded bg-slate-800 px-1", children: "udp.port == 40000" })] }), _jsxs("li", { children: ["TCP (eco): usa el filtro ", _jsx("code", { className: "rounded bg-slate-800 px-1", children: "tcp.port == 5050" })] }), _jsxs("li", { children: ["Combina filtros para separar redes: ", _jsx("code", { className: "rounded bg-slate-800 px-1", children: "ip.src == 192.168.0.10 && udp.port == 40000" })] })] })] })] }));
};
export default SettingsPage;
