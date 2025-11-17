import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSettings } from '../context/SettingsContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import heroAntenna from '../assets/antenna.svg';
const DashboardPage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { socket } = useRealtime();
    const [tests, setTests] = useState([]);
    const [selectedTestId, setSelectedTestId] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [filterMode, setFilterMode] = useState('ALL');
    const [loading, setLoading] = useState(false);
    const [livePacket, setLivePacket] = useState(null);
    const loadTests = useCallback(() => {
        setLoading(true);
        api
            .listTests(settings)
            .then((response) => {
            setTests(response);
            setSelectedTestId((prev) => prev ?? response[0]?.id ?? null);
        })
            .finally(() => setLoading(false));
    }, [settings]);
    const loadDetail = useCallback((id) => {
        api.getTestDetail(settings, id).then(setSelectedTest);
    }, [settings]);
    useEffect(() => {
        loadTests();
    }, [loadTests]);
    useEffect(() => {
        if (selectedTestId) {
            loadDetail(selectedTestId);
        }
    }, [selectedTestId, loadDetail]);
    useEffect(() => {
        if (!socket)
            return;
        const handleProgress = (payload) => {
            setLivePacket(payload.packet);
            if (payload.testId === selectedTestId) {
                setSelectedTest((prev) => {
                    if (!prev)
                        return prev;
                    if (payload.packet.status === 'sent')
                        return prev;
                    const packets = [...prev.packets.filter((p) => p.seq !== payload.packet.seq), payload.packet].sort((a, b) => a.seq - b.seq);
                    return { ...prev, packets };
                });
            }
        };
        const handleComplete = () => {
            loadTests();
            if (selectedTestId) {
                loadDetail(selectedTestId);
            }
        };
        socket.on('test-progress', handleProgress);
        socket.on('test-complete', handleComplete);
        return () => {
            socket.off('test-progress', handleProgress);
            socket.off('test-complete', handleComplete);
        };
    }, [socket, loadTests, loadDetail, selectedTestId]);
    const filteredTests = useMemo(() => {
        if (filterMode === 'ALL')
            return tests;
        return tests.filter((test) => test.mode === filterMode);
    }, [tests, filterMode]);
    const computeAverage = (mode, field) => {
        const subset = tests.filter((t) => t.mode === mode && t.status === 'completed');
        if (!subset.length)
            return 0;
        return subset.reduce((acc, test) => acc + test[field], 0) / subset.length;
    };
    const computeSpeedtestAverage = (mode, field) => {
        const subset = tests.filter((t) => t.mode === mode && t.speedtest);
        if (!subset.length)
            return 0;
        return subset.reduce((acc, test) => acc + (test.speedtest ? test.speedtest[field] : 0), 0) / subset.length;
    };
    const lanLatency = computeAverage('LAN', 'avgLatency');
    const remoteLatency = computeAverage('REMOTE', 'avgLatency');
    const lanThroughput = computeAverage('LAN', 'throughput');
    const remoteThroughput = computeAverage('REMOTE', 'throughput');
    const lanJitter = computeAverage('LAN', 'jitter');
    const remoteJitter = computeAverage('REMOTE', 'jitter');
    const lanSpeedtestDown = computeSpeedtestAverage('LAN', 'download');
    const remoteSpeedtestDown = computeSpeedtestAverage('REMOTE', 'download');
    const averageSpeedtestPing = computeSpeedtestAverage('LAN', 'ping') || computeSpeedtestAverage('REMOTE', 'ping');
    const averageLoss = tests.length ? tests.reduce((acc, test) => acc + test.packetLoss, 0) / tests.length : 0;
    const lanTests = useMemo(() => tests.filter((test) => test.mode === 'LAN'), [tests]);
    const remoteTests = useMemo(() => tests.filter((test) => test.mode === 'REMOTE'), [tests]);
    const connectionData = useMemo(() => {
        const buildRow = (label, dataset) => {
            const completadas = dataset.filter((test) => test.status === 'completed').length;
            const ejecucion = dataset.filter((test) => test.status === 'running').length;
            const fallidas = dataset.filter((test) => test.status === 'failed').length;
            return {
                label,
                completadas,
                ejecucion,
                fallidas,
                total: dataset.length
            };
        };
        return [buildRow('LAN', lanTests), buildRow('Remota', remoteTests)];
    }, [lanTests, remoteTests]);
    const heroSignalData = useMemo(() => {
        if (selectedTest?.packets?.length) {
            return selectedTest.packets
                .filter((packet) => packet.status === 'received')
                .map((packet, index) => ({ index, value: packet.rtt ?? 0 }))
                .slice(0, 12);
        }
        return [
            { index: 0, value: 58 },
            { index: 1, value: 62 },
            { index: 2, value: 60 },
            { index: 3, value: 64 },
            { index: 4, value: 59 },
            { index: 5, value: 61 }
        ];
    }, [selectedTest]);
    const buildSparkline = (mode, field) => {
        const source = tests.filter((test) => test.mode === mode).slice(0, 6);
        if (!source.length) {
            return [
                { index: 0, value: 10 },
                { index: 1, value: 15 },
                { index: 2, value: 12 },
                { index: 3, value: 18 }
            ];
        }
        return source.map((test, index) => ({ index, value: test[field] ?? 0 }));
    };
    const localSparkline = buildSparkline('LAN', 'avgLatency');
    const remoteSparkline = buildSparkline('REMOTE', 'avgLatency');
    const jitterSparkline = buildSparkline('REMOTE', 'jitter');
    const lossSparkline = buildSparkline('REMOTE', 'packetLoss');
    const analyticsCards = [
        {
            title: 'Local Network RTT',
            value: `${lanLatency.toFixed(2)} ms`,
            sublabel: 'Últimas LAN',
            color: '#4a6cf7',
            data: localSparkline
        },
        {
            title: 'Remote Network RTT',
            value: `${remoteLatency.toFixed(2)} ms`,
            sublabel: 'Últimas remotas',
            color: '#5d8cff',
            data: remoteSparkline
        },
        {
            title: 'Jitter & Variance',
            value: `${remoteJitter.toFixed(2)} ms`,
            sublabel: 'Mayor dispersión',
            color: '#10b981',
            data: jitterSparkline
        },
        {
            title: 'Packet Loss',
            value: `${averageLoss.toFixed(2)} %`,
            sublabel: 'Total pruebas',
            color: '#f97316',
            data: lossSparkline
        }
    ];
    const summaryCards = [
        {
            title: 'Download speed',
            value: `${Math.max(remoteThroughput, lanThroughput).toFixed(1)} Mbps`,
            accent: '#4a6cf7',
            detail: `${lanTests.length + remoteTests.length} pruebas registradas`,
            icon: (_jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M6 20h12M12 4v11m0 0 4-4m-4 4-4-4", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }) }))
        },
        {
            title: 'Upload speed',
            value: `${lanThroughput.toFixed(1)} Mbps`,
            accent: '#5d8cff',
            detail: `${lanTests.length} pruebas LAN`,
            icon: (_jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M6 4h12M12 20V9m0 0 4 4m-4-4-4 4", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }) }))
        },
        {
            title: 'Signal strength',
            value: selectedTest?.signalStrength ?? '-62 dBm',
            accent: '#22c55e',
            detail: selectedTest ? `${selectedTest.networkType}` : 'Sin referencia',
            icon: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M5 20a7 7 0 0 1 14 0M8 20a4 4 0 0 1 8 0", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }), _jsx("circle", { cx: "12", cy: "20", r: "1.5", fill: "currentColor" })] }))
        },
        {
            title: 'Last test',
            value: selectedTest ? `${new Date(selectedTest.createdAt).toLocaleTimeString()}` : 'Sin ejecución',
            accent: '#6366f1',
            detail: `${remoteTests.length} pruebas remotas`,
            icon: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { cx: "12", cy: "12", r: "8", stroke: "currentColor", strokeWidth: "1.5" }), _jsx("path", { d: "M12 8v4l3 2", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })] }))
        }
    ];
    const scanCards = [
        {
            title: 'Escanear LAN',
            description: 'Encuentra agentes dentro de tu red local.',
            accent: '#4a6cf7',
            mode: 'LAN',
            icon: (_jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M5 20a7 7 0 0 1 14 0M12 14v4", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }), _jsx("circle", { cx: "12", cy: "9", r: "4", stroke: "currentColor", strokeWidth: "1.6" })] }))
        },
        {
            title: 'Escanear remoto',
            description: 'Busca agentes conectados vía túnel/Tailscale.',
            accent: '#0ea5e9',
            mode: 'REMOTE',
            icon: (_jsxs("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M5 6h14M5 12h9M5 18h14", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }), _jsx("path", { d: "M18 10v4l3-2z", fill: "currentColor" })] }))
        }
    ];
    const recentEvents = useMemo(() => {
        const base = tests.slice(0, 4).map((test) => ({
            title: `${test.name} • ${test.mode}`,
            detail: `Latencia ${test.avgLatency.toFixed(1)} ms · Pérdida ${test.packetLoss.toFixed(1)}%`,
            timestamp: new Date(test.createdAt).toLocaleString()
        }));
        if (!base.length) {
            return [
                {
                    title: 'Sin eventos registrados',
                    detail: 'Ejecuta una prueba para generar actividad.',
                    timestamp: new Date().toLocaleString()
                }
            ];
        }
        return base;
    }, [tests]);
    const handleScanRedirect = (mode) => {
        navigate(`/new-test?mode=${mode}`);
    };
    const issueAlert = useMemo(() => {
        const jitterValue = Math.max(lanJitter, remoteJitter);
        if (jitterValue > 20) {
            return {
                title: 'High Jitter Detected',
                value: `${jitterValue.toFixed(1)} ms`,
                detail: 'Se detectó variación en el retardo. Revisa interferencias Wi-Fi o congestión WAN.'
            };
        }
        if (averageLoss > 10) {
            return {
                title: 'Packet Loss Alert',
                value: `${averageLoss.toFixed(1)}%`,
                detail: 'Más del 10% de los paquetes se pierden. Sugerido revisar enlaces remotos.'
            };
        }
        return {
            title: 'Weak Wi-Fi Signal',
            value: '-72 dBm',
            detail: 'La última medición inalámbrica cayó por debajo de lo recomendado.'
        };
    }, [lanJitter, remoteJitter, averageLoss]);
    const cellMapperSection = settings.cellMapperUrl ? (_jsxs("div", { className: "rounded-3xl bg-white p-6 shadow-lg", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-wide text-[#6f7780]", children: "CellMapper" }), _jsx("p", { className: "text-lg font-semibold text-[#1c1c1e]", children: "Mapa embebido" }), _jsx("p", { className: "text-xs text-[#6f7780]", children: "Visualiza cobertura m\u00F3vil con la URL configurada en Ajustes." })] }), _jsx("a", { href: settings.cellMapperUrl, target: "_blank", rel: "noreferrer", className: "rounded-full border border-slate-200 px-4 py-2 text-xs text-[#1c1c1e]", children: "Abrir CellMapper" })] }), _jsx("div", { className: "mt-4 h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200", children: _jsx("iframe", { title: "CellMapper embed", src: settings.cellMapperUrl, loading: "lazy", referrerPolicy: "no-referrer", className: "h-full w-full" }) })] })) : null;
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "flex items-center justify-between rounded-3xl bg-white px-8 py-5 shadow-lg", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-[#6f7780]", children: "Dashboard" }), _jsx("p", { className: "text-lg font-semibold text-[#1c1c1e]", children: "Telecom Performance Hub" })] }), _jsx("p", { className: "text-sm text-[#6f7780]", children: new Date().toLocaleString() })] }), _jsxs("section", { className: "grid gap-6 lg:grid-cols-5", children: [_jsxs("div", { className: "rounded-3xl bg-gradient-to-br from-white to-[#f0f4ff] p-8 shadow-2xl lg:col-span-3", children: [_jsx("p", { className: "text-sm uppercase tracking-wide text-[#6f7780]", children: "Panel principal" }), _jsx("h2", { className: "mt-3 text-4xl font-semibold text-[#1c1c1e]", children: "Telecommunications Performance Hub" }), _jsx("p", { className: "mt-2 text-[#6f7780]", children: "Controla RTT, jitter, Speedtest y disponibilidad para tus laboratorios LAN y remotos." }), _jsxs("div", { className: "mt-6 flex flex-wrap gap-4 text-sm", children: [_jsx("span", { className: "rounded-full bg-white px-4 py-1 text-[#4a6cf7] shadow", children: "Uptime 99.9%" }), _jsx("span", { className: "rounded-full bg-white px-4 py-1 text-[#4a6cf7] shadow", children: "Jitter ideal < 15 ms" }), _jsx("span", { className: "rounded-full bg-white px-4 py-1 text-[#4a6cf7] shadow", children: "Packet loss < 2%" })] }), _jsxs("div", { className: "mt-6 flex flex-wrap gap-4", children: [_jsxs("select", { className: "rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-[#1c1c1e] shadow-sm", value: filterMode, onChange: (event) => setFilterMode(event.target.value), children: [_jsx("option", { value: "ALL", children: "Todas las pruebas" }), _jsx("option", { value: "LAN", children: "Solo LAN" }), _jsx("option", { value: "REMOTE", children: "Solo remotas" })] }), _jsxs("select", { className: "rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-[#1c1c1e] shadow-sm", value: selectedTestId ?? '', onChange: (event) => setSelectedTestId(event.target.value), children: [_jsx("option", { value: "", disabled: true, children: "Selecciona prueba" }), tests.map((test) => (_jsx("option", { value: test.id, children: test.name }, test.id)))] })] }), _jsxs("div", { className: "mt-8 grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl bg-white p-4 shadow", children: [_jsx("p", { className: "text-xs text-[#6f7780]", children: "\u00DAltima prueba seleccionada" }), _jsx("p", { className: "text-2xl font-semibold text-[#1c1c1e]", children: selectedTest ? selectedTest.name : 'Sin selección' }), _jsx("p", { className: "text-sm text-[#6f7780]", children: selectedTest ? `${selectedTest.mode} · ${new Date(selectedTest.createdAt).toLocaleString()}` : 'Elige una prueba para ver el detalle.' })] }), _jsxs("div", { className: "rounded-2xl bg-white p-4 shadow", children: [_jsx("p", { className: "text-xs text-[#6f7780]", children: "Velocidad promedio Speedtest" }), _jsx("p", { className: "text-2xl font-semibold text-[#1c1c1e]", children: lanSpeedtestDown || remoteSpeedtestDown ? `${(lanSpeedtestDown || remoteSpeedtestDown).toFixed(1)} Mbps` : 'Sin datos' }), _jsxs("p", { className: "text-sm text-[#6f7780]", children: ["Ping medio: ", averageSpeedtestPing ? `${averageSpeedtestPing.toFixed(1)} ms` : 'N/D'] })] })] })] }), _jsxs("div", { className: "relative rounded-3xl bg-white/80 p-4 shadow-2xl lg:col-span-2", children: [_jsx("img", { src: heroAntenna, alt: "Telecommunications antenna", className: "mx-auto h-64 object-contain drop-shadow-lg" }), _jsxs("div", { className: "absolute left-6 top-6 w-48 rounded-2xl border border-white/60 bg-white/80 p-3 shadow-xl backdrop-blur", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-[#6f7780]", children: "Signal Strength (dBm)" }), _jsx("p", { className: "text-lg font-semibold text-[#1c1c1e]", children: selectedTest?.signalStrength ?? '-62 dBm' }), _jsx("div", { className: "mt-2 h-20", children: _jsx(ResponsiveContainer, { children: _jsx(LineChart, { data: heroSignalData, children: _jsx(Line, { type: "monotone", dataKey: "value", stroke: "#4a6cf7", strokeWidth: 2, dot: false }) }) }) })] })] })] }), _jsx("div", { className: "grid gap-4 md:grid-cols-2", children: scanCards.map((card) => (_jsxs("div", { className: "flex items-center justify-between rounded-3xl bg-white px-5 py-4 shadow hover:-translate-y-0.5 transition cursor-pointer", onClick: () => handleScanRedirect(card.mode), children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "rounded-2xl bg-[#eef1ff] p-3", style: { color: card.accent }, children: card.icon }), _jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold text-[#1c1c1e]", children: card.title }), _jsx("p", { className: "text-sm text-[#6f7780]", children: card.description })] })] }), _jsx("button", { className: "rounded-full border border-slate-200 px-4 py-2 text-xs text-[#1c1c1e]", children: "Configurar" })] }, card.title))) }), _jsx("div", { className: "grid gap-4 lg:grid-cols-4", children: analyticsCards.map((card) => (_jsxs("div", { className: "rounded-3xl border border-slate-100 bg-white p-5 shadow-lg", children: [_jsxs("div", { className: "flex items-center justify-between text-sm text-[#6f7780]", children: [_jsx("p", { children: card.title }), _jsx("span", { children: card.sublabel })] }), _jsx("p", { className: "mt-2 text-3xl font-semibold text-[#1c1c1e]", children: card.value }), _jsx("div", { className: "mt-4 h-16", children: _jsx(ResponsiveContainer, { children: _jsx(LineChart, { data: card.data, children: _jsx(Line, { type: "monotone", dataKey: "value", stroke: card.color, strokeWidth: 2, dot: false }) }) }) })] }, card.title))) }), _jsxs("section", { className: "rounded-3xl bg-[#f1f4fb] p-6 shadow-inner", children: [_jsx("p", { className: "text-sm font-semibold text-[#1c1c1e]", children: "Network Summary" }), _jsx("div", { className: "mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: summaryCards.map((card) => (_jsxs("div", { className: "flex items-center gap-4 rounded-2xl bg-white px-4 py-5 shadow", children: [_jsx("div", { className: "rounded-2xl bg-[#eef1ff] p-3", style: { color: card.accent }, children: card.icon }), _jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-[#6f7780]", children: card.title }), _jsx("p", { className: "text-xl font-semibold text-[#1c1c1e]", children: card.value }), card.detail && _jsx("p", { className: "text-xs text-[#94a3b8]", children: card.detail })] })] }, card.title))) })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-3", children: [_jsxs("div", { className: "space-y-6 lg:col-span-2", children: [_jsxs("div", { className: "rounded-3xl bg-white p-6 shadow-lg", children: [_jsx("p", { className: "text-lg font-semibold text-[#1c1c1e]", children: "Conexiones LAN vs remotas" }), _jsx("p", { className: "text-xs text-[#6f7780]", children: "Compara cu\u00E1ntas pruebas acumulaste por estado en cada tipo de red." }), _jsx("div", { className: "mt-4 h-72", children: _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: connectionData, children: [_jsx(XAxis, { dataKey: "label", stroke: "#94a3b8" }), _jsx(YAxis, { allowDecimals: false, stroke: "#94a3b8" }), _jsx(Tooltip, { contentStyle: { background: '#ffffff', borderColor: '#e2e8f0' }, formatter: (value, name) => [`${value} pruebas`, name] }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "completadas", fill: "#4a6cf7", radius: [12, 12, 0, 0], name: "Completadas", stackId: "total" }), _jsx(Bar, { dataKey: "ejecucion", fill: "#22c55e", radius: [12, 12, 0, 0], name: "En ejecuci\u00F3n", stackId: "total" }), _jsx(Bar, { dataKey: "fallidas", fill: "#f43f5e", radius: [12, 12, 0, 0], name: "Fallidas", stackId: "total" })] }) }) })] }), _jsxs("div", { className: "rounded-3xl bg-white p-6 shadow-lg", children: [_jsx("p", { className: "text-lg font-semibold text-[#1c1c1e]", children: "Recent Activity" }), _jsx("div", { className: "mt-4 divide-y divide-slate-100", children: recentEvents.map((event) => (_jsxs("div", { className: "flex items-center justify-between py-4 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-[#1c1c1e]", children: event.title }), _jsx("p", { className: "text-[#6f7780]", children: event.detail })] }), _jsx("p", { className: "text-xs text-[#a0a5b1]", children: event.timestamp })] }, event.title))) })] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-3xl bg-white p-6 shadow-lg", children: [_jsx("p", { className: "font-semibold text-[#1c1c1e]", children: "Estado de pruebas" }), _jsxs("div", { className: "mt-4 space-y-3 text-sm text-[#6f7780]", children: [_jsxs("p", { children: ["Total pruebas: ", _jsx("span", { className: "text-[#1c1c1e]", children: tests.length })] }), _jsxs("p", { children: ["En ejecuci\u00F3n: ", tests.filter((test) => test.status === 'running').length] }), _jsxs("p", { children: ["Completadas: ", tests.filter((test) => test.status === 'completed').length] }), _jsxs("p", { children: ["Fallidas: ", tests.filter((test) => test.status === 'failed').length] }), loading && _jsx("p", { className: "text-xs", children: "Actualizando m\u00E9tricas\u2026" })] })] }), _jsxs("div", { className: "rounded-3xl bg-[#1c1c1e] p-6 text-white shadow-2xl", children: [_jsx("p", { className: "text-sm uppercase tracking-wide text-white/70", children: "Network Alert" }), _jsx("p", { className: "mt-2 text-2xl font-semibold", children: issueAlert.title }), _jsx("p", { className: "text-4xl font-bold text-[#5d8cff]", children: issueAlert.value }), _jsx("p", { className: "mt-2 text-sm text-white/80", children: issueAlert.detail }), _jsx("div", { className: "mt-6 h-16", children: _jsx(ResponsiveContainer, { children: _jsx(AreaChart, { data: [{ x: 0, y: 0 }, { x: 1, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 5 }, { x: 4, y: 3 }], children: _jsx(Area, { type: "monotone", dataKey: "y", stroke: "#ff8a5c", fill: "#ff8a5c22" }) }) }) })] })] })] }), cellMapperSection, livePacket && (_jsxs("div", { className: "rounded-3xl border border-slate-200 bg-white/80 p-4 text-sm text-[#6f7780] shadow-sm", children: [_jsx("p", { className: "font-semibold text-[#1c1c1e]", children: "Actividad en vivo" }), _jsxs("p", { children: ["Paquete #", livePacket.seq, " \u2022 estado ", livePacket.status, livePacket.rtt && ` | RTT ${livePacket.rtt.toFixed(2)} ms`] })] }))] }));
};
export default DashboardPage;
