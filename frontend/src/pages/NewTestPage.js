import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useRealtime } from '../context/RealtimeContext';
const defaultForm = {
    name: 'Prueba LAN casa',
    mode: 'LAN',
    targetHost: '127.0.0.1',
    targetPort: 40000,
    protocol: 'UDP',
    packetSize: 512,
    packetCount: 20,
    intervalMs: 250,
    networkType: 'Wi-Fi casa',
    provider: 'ISP local',
    location: 'Casa - Lima',
    device: 'Laptop Ryzen',
    signalStrength: '-62 dBm',
    internetDirection: 'Fibra hogar',
    bandFrequency: '5 GHz',
    distanceDescription: 'Casa a 8 km de nodo central',
    plan: 'Plan 200 Mbps',
    signalSource: 'Mapa OSIPTEL - Lima Este',
    interpretationNotes: '',
    speedtest: null
};
const steps = [
    { title: 'Destino', subtitle: '¿Qué IP deseas probar?' },
    { title: 'Transporte', subtitle: 'Define protocolo, puertos y paquetes.' },
    { title: 'Metadatos', subtitle: 'Describe el entorno de medición.' },
    { title: 'Herramientas', subtitle: 'Escáner, Speedtest y resumen.' }
];
const modeOptions = [
    {
        key: 'LAN',
        title: 'LAN',
        description: 'Ideal para la misma red o Tailscale local.',
        icon: (_jsx("svg", { width: "42", height: "42", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M5 9.5 12 4l7 5m-14 5 7-5 7 5-7 5-7-5Z", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round" }) }))
    },
    {
        key: 'REMOTE',
        title: 'Remoto',
        description: 'Clientes conectados por Internet o túnel.',
        icon: (_jsxs("svg", { width: "42", height: "42", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { cx: "12", cy: "12", r: "7", stroke: "currentColor", strokeWidth: "1.7" }), _jsx("path", { d: "M5 12h14M12 5v14M8 12c0-3.5 1.8-7 4-7s4 3.5 4 7-1.8 7-4 7-4-3.5-4-7Z", stroke: "currentColor", strokeWidth: "1" })] }))
    }
];
const NewTestPage = () => {
    const [searchParams] = useSearchParams();
    const { settings } = useSettings();
    const { socket } = useRealtime();
    const [form, setForm] = useState(defaultForm);
    const [currentStep, setCurrentStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [activeTestId, setActiveTestId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [lastPacket, setLastPacket] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [scanRange, setScanRange] = useState('192.168.0.0/24');
    const [scanResults, setScanResults] = useState([]);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanError, setScanError] = useState(null);
    const [lastScanMode, setLastScanMode] = useState('LAN');
    const [speedtestResult, setSpeedtestResult] = useState(null);
    const [speedtestLoading, setSpeedtestLoading] = useState(false);
    const [speedtestError, setSpeedtestError] = useState(null);
    const [portRange, setPortRange] = useState('1-1024');
    const [portScanResult, setPortScanResult] = useState(null);
    const [portScanLoading, setPortScanLoading] = useState(false);
    const [portScanError, setPortScanError] = useState(null);
    const handleModeSelect = useCallback((mode) => {
        setForm((prev) => ({ ...prev, mode }));
        setLastScanMode(mode);
        setScanResults([]);
        setScanRange(mode === 'LAN' ? '192.168.0.0/24' : '100.64.0.0/24');
    }, []);
    useEffect(() => {
        const modeParam = searchParams.get('mode');
        if (modeParam === 'LAN' || modeParam === 'REMOTE') {
            handleModeSelect(modeParam);
            setCurrentStep(0);
        }
    }, [searchParams, handleModeSelect]);
    useEffect(() => {
        if (!socket)
            return;
        const handleProgress = (payload) => {
            if (payload.testId !== activeTestId)
                return;
            setProgress(Math.round(payload.progress * 100));
            setLastPacket(payload.packet);
        };
        const handleComplete = (payload) => {
            if (payload.testId === activeTestId) {
                setFeedback('Prueba finalizada. Revisa el dashboard para comparar LAN vs remota.');
                setActiveTestId(null);
            }
        };
        socket.on('test-progress', handleProgress);
        socket.on('test-complete', handleComplete);
        return () => {
            socket.off('test-progress', handleProgress);
            socket.off('test-complete', handleComplete);
        };
    }, [socket, activeTestId]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (currentStep < steps.length - 1) {
            setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
            return;
        }
        setSubmitting(true);
        setFeedback(null);
        try {
            const payload = {
                ...form,
                speedtest: speedtestResult ?? undefined
            };
            const response = await api.createTest(settings, payload);
            setActiveTestId(response.id);
            setFeedback('Prueba enviada. Se mostrarán los paquetes en vivo en este panel.');
            setProgress(0);
            setLastPacket(null);
        }
        catch (error) {
            setFeedback(error.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleScanNetwork = async () => {
        setScanLoading(true);
        setScanError(null);
        setLastScanMode(form.mode);
        try {
            const result = await api.scanNetwork(settings, scanRange);
            setScanResults(result.devices);
        }
        catch (error) {
            setScanError(error.message);
        }
        finally {
            setScanLoading(false);
        }
    };
    const handleRunSpeedtest = async () => {
        setSpeedtestLoading(true);
        setSpeedtestError(null);
        try {
            const snapshot = await api.runSpeedtest(settings);
            setSpeedtestResult(snapshot);
            setForm((prev) => ({ ...prev, speedtest: snapshot }));
        }
        catch (error) {
            setSpeedtestError(error.message);
        }
        finally {
            setSpeedtestLoading(false);
        }
    };
    const handlePortScan = async () => {
        setPortScanLoading(true);
        setPortScanError(null);
        try {
            const result = await api.portScan(settings, form.targetHost, portRange);
            setPortScanResult(result);
        }
        catch (error) {
            setPortScanError(error.message);
        }
        finally {
            setPortScanLoading(false);
        }
    };
    const renderModeCards = () => (_jsx("div", { className: "mt-4 grid gap-3 md:grid-cols-2", children: modeOptions.map((option) => {
            const isActive = form.mode === option.key;
            return (_jsxs("button", { type: "button", className: `flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${isActive ? 'border-transparent bg-gradient-to-r from-[#4a6cf7] to-[#5d8cff] text-white shadow-lg' : 'border-slate-100 bg-white text-[#1c1c1e]'}`, onClick: () => handleModeSelect(option.key), children: [_jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold", children: option.title }), _jsx("p", { className: `text-sm ${isActive ? 'text-white/80' : 'text-[#6f7780]'}`, children: option.description })] }), _jsx("div", { className: `rounded-2xl p-3 ${isActive ? 'bg-white/20' : 'bg-[#eef1ff]'}`, style: { color: isActive ? '#fff' : '#4a6cf7' }, children: option.icon })] }, option.key));
        }) }));
    const renderDestinationStep = () => (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "rounded-3xl bg-white p-6 shadow", children: [_jsx("p", { className: "text-sm font-semibold text-[#1c1c1e]", children: "\u00BFQu\u00E9 IP deseas probar?" }), _jsxs("div", { className: "mt-3 grid gap-3 md:grid-cols-[2fr,1fr]", children: [_jsx("input", { className: "rounded-2xl border border-slate-200 px-4 py-3 text-lg text-[#1c1c1e]", value: form.targetHost, onChange: (event) => setForm({ ...form, targetHost: event.target.value }), required: true }), _jsx("input", { className: "rounded-2xl border border-slate-200 px-4 py-3 text-lg text-[#1c1c1e]", type: "number", min: 1, max: 65535, value: form.targetPort, onChange: (event) => setForm({ ...form, targetPort: Number(event.target.value) }), required: true })] }), _jsx("p", { className: "mt-2 text-xs text-[#6f7780]", children: form.mode === 'LAN'
                            ? 'Usa IP privada dentro de tu segmento o la IP de un agente conectado por Tailscale local.'
                            : 'Usa IP pública de la otra sede o la IP virtual del túnel remoto.' })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Nombre de la prueba", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.name, onChange: (event) => setForm({ ...form, name: event.target.value }), required: true })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Dispositivo que ejecuta la prueba", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.device, onChange: (event) => setForm({ ...form, device: event.target.value }), required: true })] })] }), _jsxs("div", { className: "rounded-3xl bg-white p-6 shadow", children: [_jsx("p", { className: "text-sm font-semibold text-[#1c1c1e]", children: "Selecciona el modo de conexi\u00F3n" }), renderModeCards(), _jsxs("p", { className: "mt-3 text-xs text-[#6f7780]", children: ["El esc\u00E1ner y el dashboard agrupar\u00E1n esta prueba como ", form.mode === 'LAN' ? 'LAN local' : 'Remota / Internet', "."] })] })] }));
    const renderTransportStep = () => (_jsx("div", { className: "space-y-5", children: _jsxs("div", { className: "rounded-3xl bg-white p-6 shadow", children: [_jsx("p", { className: "text-sm font-semibold text-[#1c1c1e]", children: "Transporte y temporizaci\u00F3n" }), _jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Protocolo", _jsxs("select", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.protocol, onChange: (event) => setForm({ ...form, protocol: event.target.value }), children: [_jsx("option", { value: "UDP", children: "UDP 40000 (Wireshark: udp.port == 40000)" }), _jsx("option", { value: "TCP", children: "TCP 5050 (Wireshark: tcp.port == 5050)" })] })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Intervalo entre paquetes (ms)", _jsx("input", { type: "number", min: 10, className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.intervalMs, onChange: (event) => setForm({ ...form, intervalMs: Number(event.target.value) }) })] })] }), _jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-3", children: [_jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Tama\u00F1o de paquete (bytes)", _jsx("input", { type: "number", min: 32, className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.packetSize, onChange: (event) => setForm({ ...form, packetSize: Number(event.target.value) }) })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["N\u00FAmero de paquetes", _jsx("input", { type: "number", min: 5, className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.packetCount, onChange: (event) => setForm({ ...form, packetCount: Number(event.target.value) }) })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Direcci\u00F3n / referencia", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.internetDirection, onChange: (event) => setForm({ ...form, internetDirection: event.target.value }) })] })] })] }) }));
    const renderMetadataStep = () => (_jsx("div", { className: "space-y-5", children: _jsxs("div", { className: "rounded-3xl bg-white p-6 shadow", children: [_jsx("p", { className: "text-sm font-semibold text-[#1c1c1e]", children: "Describe la red y el contexto" }), _jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Tipo de red", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.networkType, onChange: (event) => setForm({ ...form, networkType: event.target.value }) })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Operador / ISP", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.provider, onChange: (event) => setForm({ ...form, provider: event.target.value }) })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Ubicaci\u00F3n", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.location, onChange: (event) => setForm({ ...form, location: event.target.value }) })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Intensidad de se\u00F1al (dBm)", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.signalStrength, onChange: (event) => setForm({ ...form, signalStrength: event.target.value }) })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Banda / frecuencia", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.bandFrequency, onChange: (event) => setForm({ ...form, bandFrequency: event.target.value }) })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Distancia / referencia", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.distanceDescription, onChange: (event) => setForm({ ...form, distanceDescription: event.target.value }) })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Plan contratado", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.plan, onChange: (event) => setForm({ ...form, plan: event.target.value }) })] }), _jsxs("label", { className: "text-sm text-[#6f7780]", children: ["Fuente de se\u00F1al / referencia regulatoria", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: form.signalSource, onChange: (event) => setForm({ ...form, signalSource: event.target.value }) })] })] }), _jsxs("label", { className: "mt-4 block text-sm text-[#6f7780]", children: ["Notas para el informe", _jsx("textarea", { className: "mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2", rows: 3, value: form.interpretationNotes, onChange: (event) => setForm({ ...form, interpretationNotes: event.target.value }) })] })] }) }));
    const renderToolsStep = () => {
        const scanTitle = form.mode === 'LAN' ? 'Escáner LAN' : 'Escáner remoto';
        const scanDescription = form.mode === 'LAN'
            ? 'Busca agentes dentro de tu segmento local (192.168.x.x). Recomendado cuando ambos equipos están en la misma casa/laboratorio.'
            : 'Escanea rangos públicos o direcciones de túnel (Tailscale 100.64.0.0/10) para ubicar agentes remotos.';
        const scanPlaceholder = form.mode === 'LAN' ? '192.168.0.0/24' : '100.64.0.0/24';
        return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-3xl bg-[#050b23] p-5 text-white shadow-lg", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold", children: scanTitle }), _jsx("p", { className: "text-xs text-white/70", children: scanDescription })] }), _jsxs("span", { className: "rounded-full bg-white/10 px-3 py-1 text-xs", children: ["\u00DAltimo escaneo: ", lastScanMode === 'LAN' ? 'LAN' : 'Remoto'] })] }), _jsxs("div", { className: "mt-4 flex flex-col gap-3 md:flex-row md:items-end", children: [_jsxs("label", { className: "flex-1 text-xs text-white/70", children: ["Rango CIDR", _jsx("input", { className: "mt-1 w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-white", placeholder: scanPlaceholder, value: scanRange, onChange: (event) => setScanRange(event.target.value) })] }), _jsx("button", { type: "button", className: "rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50", onClick: handleScanNetwork, disabled: scanLoading, children: scanLoading ? 'Escaneando...' : `Escanear ${form.mode === 'LAN' ? 'LAN' : 'Remoto'}` })] }), scanError && _jsx("p", { className: "mt-2 text-xs text-rose-300", children: scanError }), _jsx("div", { className: "mt-3 grid gap-3 text-xs text-white/90 md:grid-cols-2", children: scanResults.length ? (scanResults.slice(0, 6).map((device) => (_jsxs("button", { type: "button", className: "flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-left transition hover:bg-white/20", onClick: () => setForm({ ...form, targetHost: device.ip }), children: [_jsx("div", { className: "rounded-2xl bg-white/30 p-2 text-white", children: _jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M5 20a7 7 0 0 1 14 0M8 20a4 4 0 0 1 8 0", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }), _jsx("circle", { cx: "12", cy: "20", r: "1.3", fill: "currentColor" })] }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-white", children: device.ip }), _jsx("p", { className: "text-[11px] text-white/70", children: device.hostname ?? device.vendor ?? 'Dispositivo detectado' })] })] }, `${device.ip}-${device.mac ?? device.hostname ?? 'device'}`)))) : (_jsx("p", { className: "text-xs text-white/70 md:col-span-2", children: "Ejecuta el escaneo para sugerir IPs disponibles." })) })] }), _jsxs("div", { className: "rounded-3xl bg-white p-5 shadow", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-[#1c1c1e]", children: "PortDroid \u00B7 Escaneo de puertos" }), _jsxs("p", { className: "text-xs text-[#6f7780]", children: ["Analiza servicios abiertos en ", form.targetHost, "."] })] }), _jsx("span", { className: "rounded-full bg-[#eef1ff] px-3 py-1 text-xs text-[#4a6cf7]", children: portScanResult ? `${portScanResult.ports.length} hallazgos` : 'Sin datos' })] }), _jsxs("div", { className: "mt-3 flex flex-col gap-3 md:flex-row md:items-end", children: [_jsxs("label", { className: "flex-1 text-xs text-[#6f7780]", children: ["Rango de puertos (ej. 1-1024 o 22,80,443)", _jsx("input", { className: "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2", value: portRange, onChange: (event) => setPortRange(event.target.value) })] }), _jsx("button", { type: "button", className: "rounded-xl bg-[#0ea5e9] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50", onClick: handlePortScan, disabled: portScanLoading, children: portScanLoading ? 'Escaneando...' : 'Escanear puertos' })] }), portScanError && _jsx("p", { className: "mt-2 text-xs text-rose-500", children: portScanError }), _jsx("div", { className: "mt-3 grid gap-3 text-xs text-[#1c1c1e] md:grid-cols-2", children: portScanResult && portScanResult.ports.length ? (portScanResult.ports.slice(0, 8).map((entry) => (_jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#f8fafc] px-3 py-2", children: [_jsx("div", { className: `h-8 w-8 rounded-2xl text-center text-sm font-semibold leading-8 ${entry.state === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`, children: entry.port }), _jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold", children: [entry.state.toUpperCase(), " \u00B7 ", entry.protocol] }), entry.service && _jsx("p", { className: "text-[11px] text-[#6f7780]", children: entry.service })] })] }, `${entry.port}-${entry.protocol}`)))) : (_jsx("p", { className: "text-xs text-[#6f7780] md:col-span-2", children: "Ejecuta un escaneo para mostrar puertos detectados." })) })] }), _jsxs("div", { className: "rounded-3xl bg-white p-5 shadow", children: [_jsx("p", { className: "text-sm font-semibold text-[#1c1c1e]", children: "Speedtest CLI" }), _jsx("p", { className: "text-xs text-[#6f7780]", children: "Mide con Ookla y adjunta el resultado para el dashboard." }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-3", children: [_jsx("button", { type: "button", className: "rounded-xl bg-[#4a6cf7] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50", onClick: handleRunSpeedtest, disabled: speedtestLoading, children: speedtestLoading ? 'Midiendo...' : 'Ejecutar Speedtest' }), speedtestResult && (_jsx("button", { type: "button", className: "rounded-xl border border-rose-200 px-3 py-2 text-xs text-rose-500", onClick: () => {
                                        setSpeedtestResult(null);
                                        setForm((prev) => ({ ...prev, speedtest: null }));
                                    }, children: "Limpiar" })), speedtestError && _jsx("p", { className: "text-xs text-rose-500", children: speedtestError })] }), speedtestResult && (_jsxs("div", { className: "mt-4 grid gap-4 text-xs text-[#6f7780] md:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl bg-[#f7f8fa] p-3 text-center", children: [_jsx("p", { className: "text-[11px] uppercase tracking-wide text-[#6f7780]", children: "Ping" }), _jsxs("p", { className: "text-xl font-semibold text-[#1c1c1e]", children: [speedtestResult.ping.toFixed(2), " ms"] })] }), _jsxs("div", { className: "rounded-2xl bg-[#f7f8fa] p-3 text-center", children: [_jsx("p", { className: "text-[11px] uppercase tracking-wide text-[#6f7780]", children: "Download" }), _jsxs("p", { className: "text-xl font-semibold text-[#1c1c1e]", children: [speedtestResult.download.toFixed(2), " Mbps"] })] }), _jsxs("div", { className: "rounded-2xl bg-[#f7f8fa] p-3 text-center", children: [_jsx("p", { className: "text-[11px] uppercase tracking-wide text-[#6f7780]", children: "Upload" }), _jsxs("p", { className: "text-xl font-semibold text-[#1c1c1e]", children: [speedtestResult.upload.toFixed(2), " Mbps"] })] }), _jsxs("p", { children: ["Servidor: ", _jsx("span", { className: "text-[#1c1c1e]", children: speedtestResult.server })] }), _jsxs("p", { children: ["ISP: ", _jsx("span", { className: "text-[#1c1c1e]", children: speedtestResult.isp })] }), _jsxs("p", { className: "md:col-span-3", children: ["Tomado: ", new Date(speedtestResult.timestamp).toLocaleString()] })] }))] }), _jsxs("div", { className: "rounded-3xl bg-slate-50 p-5", children: [_jsx("p", { className: "text-sm font-semibold text-[#1c1c1e]", children: "Resumen para lanzar la prueba" }), _jsxs("ul", { className: "mt-3 space-y-1 text-sm text-[#6f7780]", children: [_jsxs("li", { children: [_jsx("strong", { children: "Destino:" }), " ", form.targetHost, ":", form.targetPort] }), _jsxs("li", { children: [_jsx("strong", { children: "Modo:" }), " ", form.mode, " - ", form.protocol] }), _jsxs("li", { children: [_jsx("strong", { children: "Paquetes:" }), " ", form.packetCount, " x ", form.packetSize, " bytes cada ", form.intervalMs, " ms"] }), _jsxs("li", { children: [_jsx("strong", { children: "Red:" }), " ", form.networkType, " - ", form.provider] })] }), _jsx("p", { className: "mt-2 text-xs text-[#94a3b8]", children: "Filtros sugeridos en Wireshark: udp.port == 40000 o tcp.port == 5050." })] })] }));
    };
    const stepContent = useMemo(() => {
        switch (currentStep) {
            case 0:
                return renderDestinationStep();
            case 1:
                return renderTransportStep();
            case 2:
                return renderMetadataStep();
            default:
                return renderToolsStep();
        }
    }, [currentStep, form, scanRange, scanResults, scanLoading, scanError, speedtestResult, speedtestLoading, speedtestError, lastScanMode]);
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-semibold text-[#1c1c1e]", children: "Nueva prueba" }), _jsx("p", { className: "text-sm text-[#6f7780]", children: "Configura pruebas LAN y remotas para comparar latencia, jitter y Speedtest." })] }), _jsxs("form", { className: "space-y-6 rounded-3xl bg-white p-6 shadow", onSubmit: handleSubmit, children: [_jsx("div", { className: "flex flex-wrap items-center gap-3", children: steps.map((step, index) => (_jsxs("button", { type: "button", className: `flex-1 rounded-2xl px-4 py-3 text-left text-sm transition ${index === currentStep ? 'bg-[#4a6cf7] text-white shadow' : 'bg-slate-50 text-[#6f7780] hover:bg-white'}`, onClick: () => setCurrentStep(index), children: [_jsx("p", { className: "font-semibold", children: step.title }), _jsx("p", { className: "text-xs", children: step.subtitle })] }, step.title))) }), stepContent, _jsxs("div", { className: "flex items-center justify-between pt-4", children: [_jsx("button", { type: "button", className: "rounded-xl border border-slate-200 px-4 py-2 text-sm text-[#1c1c1e] disabled:opacity-50", onClick: () => setCurrentStep((prev) => Math.max(prev - 1, 0)), disabled: currentStep === 0, children: "Anterior" }), currentStep === steps.length - 1 ? (_jsx("button", { type: "submit", className: "rounded-xl bg-[#4a6cf7] px-6 py-2 text-sm font-semibold text-white disabled:opacity-50", disabled: submitting, children: submitting ? 'Enviando...' : 'Iniciar prueba' })) : (_jsx("button", { type: "submit", className: "rounded-xl bg-[#4a6cf7] px-6 py-2 text-sm font-semibold text-white", children: "Siguiente" }))] })] }), _jsxs("div", { className: "rounded-3xl bg-white p-6 shadow", children: [_jsx("p", { className: "font-semibold text-[#1c1c1e]", children: "Progreso en tiempo real" }), activeTestId ? (_jsxs("div", { className: "mt-4 space-y-2 text-sm text-[#6f7780]", children: [_jsx("div", { className: "h-3 w-full rounded-full bg-slate-200", children: _jsx("div", { className: "h-3 rounded-full bg-[#4a6cf7]", style: { width: `${progress}%` } }) }), _jsxs("p", { children: [progress, "% completado"] }), lastPacket && (_jsxs("p", { children: ["\u00DAltimo paquete #", lastPacket.seq, " - estado ", lastPacket.status, lastPacket.rtt && ` | RTT ${lastPacket.rtt.toFixed(2)} ms`] })), _jsx("p", { className: "text-xs text-[#94a3b8]", children: "Filtra en Wireshark: udp.port == 40000 o tcp.port == 5050." })] })) : (_jsx("p", { className: "mt-2 text-sm text-[#6f7780]", children: "Inicia una prueba para ver el progreso aqu\u00ED." })), feedback && _jsx("p", { className: "mt-4 text-xs text-[#6f7780]", children: feedback })] })] }));
};
export default NewTestPage;
