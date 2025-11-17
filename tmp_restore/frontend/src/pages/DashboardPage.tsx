import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { KpiCard } from '../components/cards/KpiCard';
import { useSettings } from '../context/SettingsContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { PacketProgress, TestDetail, TestRecord } from '../types/test';

const DashboardPage = () => {
  const { settings } = useSettings();
  const { socket } = useRealtime();
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestDetail | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'LAN' | 'REMOTE'>('ALL');
  const [loading, setLoading] = useState(false);
  const [livePacket, setLivePacket] = useState<PacketProgress | null>(null);

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

  const loadDetail = useCallback(
    (id: string) => {
      api.getTestDetail(settings, id).then(setSelectedTest);
    },
    [settings]
  );

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  useEffect(() => {
    if (selectedTestId) {
      loadDetail(selectedTestId);
    }
  }, [selectedTestId, loadDetail]);

  useEffect(() => {
    if (!socket) return;
    const handleProgress = (payload: { testId: string; packet: PacketProgress }) => {
      setLivePacket(payload.packet);
      if (payload.testId === selectedTestId) {
        setSelectedTest((prev) => {
          if (!prev) return prev;
          if (payload.packet.status === 'sent') return prev;
          const packets = [...prev.packets.filter((p) => p.seq !== payload.packet.seq), payload.packet].sort(
            (a, b) => a.seq - b.seq
          );
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
    if (filterMode === 'ALL') return tests;
    return tests.filter((test) => test.mode === filterMode);
  }, [tests, filterMode]);

  const computeAverage = (mode: 'LAN' | 'REMOTE', field: keyof TestRecord) => {
    const subset = tests.filter((t) => t.mode === mode && t.status === 'completed');
    if (!subset.length) return 0;
    return subset.reduce((acc, test) => acc + (test[field] as number), 0) / subset.length;
  };

  const lanLatency = computeAverage('LAN', 'avgLatency');
  const remoteLatency = computeAverage('REMOTE', 'avgLatency');
  const lanThroughput = computeAverage('LAN', 'throughput');
  const remoteThroughput = computeAverage('REMOTE', 'throughput');
  const lossAvg = tests.length
    ? tests.reduce((acc, test) => acc + test.packetLoss, 0) / tests.length
    : 0;

  const throughputBarData = [
    { mode: 'LAN', latency: Number(lanLatency.toFixed(2)), throughput: Number(lanThroughput.toFixed(2)) },
    { mode: 'Remota', latency: Number(remoteLatency.toFixed(2)), throughput: Number(remoteThroughput.toFixed(2)) }
  ];

  const networkDistribution = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredTests.forEach((test) => {
      groups[test.networkType] = (groups[test.networkType] ?? 0) + 1;
    });
    return Object.entries(groups).map(([name, count]) => ({ network: name, count }));
  }, [filteredTests]);

  const lineData =
    selectedTest?.packets
      .filter((packet) => packet.status === 'received')
      .map((packet) => ({ seq: packet.seq, rtt: packet.rtt ?? 0 })) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard de desempeño</h1>
          <p className="text-sm text-slate-400">Comparador LAN vs redes remotas con métricas en tiempo real.</p>
        </div>
        <div className="flex gap-3">
          <select
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            value={filterMode}
            onChange={(event) => setFilterMode(event.target.value as 'ALL' | 'LAN' | 'REMOTE')}
          >
            <option value="ALL">Todas las pruebas</option>
            <option value="LAN">Solo LAN</option>
            <option value="REMOTE">Solo remotas</option>
          </select>
          <select className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
            <option>Últimos 30 días</option>
            <option>Últimos 7 días</option>
            <option>Hoy</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Latencia promedio LAN" value={`${lanLatency.toFixed(2)} ms`} accent="green" />
        <KpiCard title="Latencia promedio remota" value={`${remoteLatency.toFixed(2)} ms`} accent="orange" />
        <KpiCard title="Throughput comparado" value={`${lanThroughput.toFixed(2)} / ${remoteThroughput.toFixed(2)} Mbps`} />
        <KpiCard title="Pérdida promedio" value={`${lossAvg.toFixed(2)} %`} />
      </div>

      {livePacket && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
          <p className="font-semibold text-white">Actividad en vivo</p>
          <p>
            Paquete #{livePacket.seq} – estado: {livePacket.status}
            {livePacket.rtt && ` | RTT ${livePacket.rtt.toFixed(2)} ms`}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold">RTT por paquete</p>
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
              value={selectedTestId ?? ''}
              onChange={(event) => setSelectedTestId(event.target.value)}
            >
              <option value="">Selecciona prueba</option>
              {tests.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={lineData}>
                <XAxis dataKey="seq" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" unit=" ms" />
                <Tooltip contentStyle={{ background: '#020617', borderColor: '#1e293b' }} />
                <Line type="monotone" dataKey="rtt" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="font-semibold">Comparación LAN vs Remota</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={throughputBarData}>
                <XAxis dataKey="mode" stroke="#94a3b8" />
                <YAxis yAxisId="left" orientation="left" stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#020617', borderColor: '#1e293b' }} />
                <Legend />
                <Bar dataKey="latency" fill="#f97316" name="Latencia (ms)" yAxisId="left" />
                <Bar dataKey="throughput" fill="#38bdf8" name="Throughput (Mbps)" yAxisId="right" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="font-semibold">Distribución por tipo de red</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <AreaChart data={networkDistribution}>
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="network" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#020617', borderColor: '#1e293b' }} />
                <Area type="monotone" dataKey="count" stroke="#38bdf8" fillOpacity={1} fill="url(#colorNet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="font-semibold">Estado de pruebas</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>Total pruebas: {tests.length}</p>
            <p>En ejecución: {tests.filter((test) => test.status === 'running').length}</p>
            <p>Completadas: {tests.filter((test) => test.status === 'completed').length}</p>
            <p>Fallidas: {tests.filter((test) => test.status === 'failed').length}</p>
          </div>
          {loading && <p className="mt-4 text-xs text-slate-500">Actualizando métricas…</p>}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
