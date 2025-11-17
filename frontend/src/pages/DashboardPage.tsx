import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import { useSettings } from '../context/SettingsContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { PacketProgress, TestDetail, TestRecord } from '../types/test';
import heroAntenna from '../assets/antenna.svg';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { socket } = useRealtime();
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestDetail | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'LAN' | 'REMOTE'>('ALL');
  const [loading, setLoading] = useState(false);
  const [livePacket, setLivePacket] = useState<PacketProgress | null>(null);
  const [mapReady, setMapReady] = useState(false);

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
    setMapReady(true);
  }, []);

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

  const computeSpeedtestAverage = (mode: 'LAN' | 'REMOTE', field: 'download' | 'upload' | 'ping') => {
    const subset = tests.filter((t) => t.mode === mode && t.speedtest);
    if (!subset.length) return 0;
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
    const buildRow = (label: 'LAN' | 'Remota', dataset: TestRecord[]) => {
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
  const geoTests = useMemo(
    () =>
      tests.filter(
        (test) => typeof test.latitude === 'number' && typeof test.longitude === 'number'
      ),
    [tests]
  );
  const mapCenter = useMemo<[number, number]>(() => {
    if (geoTests.length) {
      return [geoTests[0].latitude as number, geoTests[0].longitude as number];
    }
    return [-12.0464, -77.0428];
  }, [geoTests]);

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

  const buildSparkline = (mode: 'LAN' | 'REMOTE', field: keyof TestRecord) => {
    const source = tests.filter((test) => test.mode === mode).slice(0, 6);
    if (!source.length) {
      return [
        { index: 0, value: 10 },
        { index: 1, value: 15 },
        { index: 2, value: 12 },
        { index: 3, value: 18 }
      ];
    }
    return source.map((test, index) => ({ index, value: (test[field] as number) ?? 0 }));
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
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M6 20h12M12 4v11m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    },
    {
      title: 'Upload speed',
      value: `${lanThroughput.toFixed(1)} Mbps`,
      accent: '#5d8cff',
      detail: `${lanTests.length} pruebas LAN`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M6 4h12M12 20V9m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    },
    {
      title: 'Signal strength',
      value: selectedTest?.signalStrength ?? '-62 dBm',
      accent: '#22c55e',
      detail: selectedTest ? `${selectedTest.networkType}` : 'Sin referencia',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 20a7 7 0 0 1 14 0M8 20a4 4 0 0 1 8 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="20" r="1.5" fill="currentColor" />
        </svg>
      )
    },
    {
      title: 'Last test',
      value: selectedTest ? `${new Date(selectedTest.createdAt).toLocaleTimeString()}` : 'Sin ejecución',
      accent: '#6366f1',
      detail: `${remoteTests.length} pruebas remotas`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    }
];

const scanCards = [
  {
    title: 'Escanear LAN',
    description: 'Encuentra agentes dentro de tu red local.',
    accent: '#4a6cf7',
    mode: 'LAN' as const,
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M5 20a7 7 0 0 1 14 0M12 14v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    )
  },
  {
    title: 'Escanear remoto',
    description: 'Busca agentes conectados vía túnel/Tailscale.',
    accent: '#0ea5e9',
    mode: 'REMOTE' as const,
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 6h14M5 12h9M5 18h14"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M18 10v4l3-2z" fill="currentColor" />
      </svg>
    )
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

  const handleScanRedirect = (mode: 'LAN' | 'REMOTE') => {
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

  const cellMapperSection = mapReady ? (
      <div className="rounded-3xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-[#6f7780]">Mapa de mediciones</p>
            <p className="text-lg font-semibold text-[#1c1c1e]">Cobertura LAN vs remota</p>
            <p className="text-xs text-[#6f7780]">
              Visualiza dónde se ejecutaron las pruebas y compara resultados según la ubicación.
            </p>
          </div>
          {settings.cellMapperUrl && (
            <a
              href={settings.cellMapperUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs text-[#1c1c1e]"
            >
              Abrir CellMapper
            </a>
          )}
        </div>
        <div className="mt-4 h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200">
          {geoTests.length ? (
            <MapContainer
              center={mapCenter}
              zoom={geoTests.length ? 9 : 3}
              className="h-full w-full"
              scrollWheelZoom={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              {geoTests.map((test) => (
                <CircleMarker
                  key={test.id}
                  center={[test.latitude as number, test.longitude as number]}
                  radius={10}
                  color={test.mode === 'LAN' ? '#4a6cf7' : '#f97316'}
                  fillColor={test.mode === 'LAN' ? '#4a6cf7' : '#f97316'}
                  fillOpacity={0.8}
                >
                  <LeafletTooltip direction="top" offset={[0, -10]} opacity={0.9}>
                    <div>
                      <p className="font-semibold text-[#1c1c1e]">{test.name}</p>
                      <p className="text-xs text-[#6f7780]">
                        {test.mode} · Lat {test.avgLatency.toFixed(1)} ms · Loss {test.packetLoss.toFixed(1)}%
                      </p>
                      <p className="text-xs text-[#6f7780]">{test.location}</p>
                    </div>
                  </LeafletTooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-[#6f7780]">
              <p>No hay coordenadas registradas aún.</p>
              <p>Completa latitud/longitud en “Metadatos” al crear una prueba.</p>
            </div>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between rounded-3xl bg-white px-8 py-5 shadow-lg">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#6f7780]">Dashboard</p>
          <p className="text-lg font-semibold text-[#1c1c1e]">Telecom Performance Hub</p>
        </div>
        <p className="text-sm text-[#6f7780]">{new Date().toLocaleString()}</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-3xl bg-gradient-to-br from-white to-[#f0f4ff] p-8 shadow-2xl lg:col-span-3">
          <p className="text-sm uppercase tracking-wide text-[#6f7780]">Panel principal</p>
          <h2 className="mt-3 text-4xl font-semibold text-[#1c1c1e]">Telecommunications Performance Hub</h2>
          <p className="mt-2 text-[#6f7780]">
            Controla RTT, jitter, Speedtest y disponibilidad para tus laboratorios LAN y remotos.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <span className="rounded-full bg-white px-4 py-1 text-[#4a6cf7] shadow">Uptime 99.9%</span>
            <span className="rounded-full bg-white px-4 py-1 text-[#4a6cf7] shadow">Jitter ideal &lt; 15 ms</span>
            <span className="rounded-full bg-white px-4 py-1 text-[#4a6cf7] shadow">Packet loss &lt; 2%</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-[#1c1c1e] shadow-sm"
              value={filterMode}
              onChange={(event) => setFilterMode(event.target.value as 'ALL' | 'LAN' | 'REMOTE')}
            >
              <option value="ALL">Todas las pruebas</option>
              <option value="LAN">Solo LAN</option>
              <option value="REMOTE">Solo remotas</option>
            </select>
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-[#1c1c1e] shadow-sm"
              value={selectedTestId ?? ''}
              onChange={(event) => setSelectedTestId(event.target.value)}
            >
              <option value="" disabled>
                Selecciona prueba
              </option>
              {tests.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-xs text-[#6f7780]">Última prueba seleccionada</p>
              <p className="text-2xl font-semibold text-[#1c1c1e]">
                {selectedTest ? selectedTest.name : 'Sin selección'}
              </p>
              <p className="text-sm text-[#6f7780]">
                {selectedTest ? `${selectedTest.mode} · ${new Date(selectedTest.createdAt).toLocaleString()}` : 'Elige una prueba para ver el detalle.'}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-xs text-[#6f7780]">Velocidad promedio Speedtest</p>
              <p className="text-2xl font-semibold text-[#1c1c1e]">
                {lanSpeedtestDown || remoteSpeedtestDown ? `${(lanSpeedtestDown || remoteSpeedtestDown).toFixed(1)} Mbps` : 'Sin datos'}
              </p>
              <p className="text-sm text-[#6f7780]">Ping medio: {averageSpeedtestPing ? `${averageSpeedtestPing.toFixed(1)} ms` : 'N/D'}</p>
            </div>
          </div>
        </div>
        <div className="relative rounded-3xl bg-white/80 p-4 shadow-2xl lg:col-span-2">
          <img src={heroAntenna} alt="Telecommunications antenna" className="mx-auto h-64 object-contain drop-shadow-lg" />
          <div className="absolute left-6 top-6 w-48 rounded-2xl border border-white/60 bg-white/80 p-3 shadow-xl backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-[#6f7780]">Signal Strength (dBm)</p>
            <p className="text-lg font-semibold text-[#1c1c1e]">{selectedTest?.signalStrength ?? '-62 dBm'}</p>
            <div className="mt-2 h-20">
              <ResponsiveContainer>
                <LineChart data={heroSignalData}>
                  <Line type="monotone" dataKey="value" stroke="#4a6cf7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {scanCards.map((card) => (
          <div
            key={card.title}
            className="flex items-center justify-between rounded-3xl bg-white px-5 py-4 shadow hover:-translate-y-0.5 transition cursor-pointer"
            onClick={() => handleScanRedirect(card.mode)}
          >
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-[#eef1ff] p-3" style={{ color: card.accent }}>
                {card.icon}
              </div>
              <div>
                <p className="text-lg font-semibold text-[#1c1c1e]">{card.title}</p>
                <p className="text-sm text-[#6f7780]">{card.description}</p>
              </div>
            </div>
            <button className="rounded-full border border-slate-200 px-4 py-2 text-xs text-[#1c1c1e]">Configurar</button>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {analyticsCards.map((card) => (
          <div key={card.title} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between text-sm text-[#6f7780]">
              <p>{card.title}</p>
              <span>{card.sublabel}</span>
            </div>
            <p className="mt-2 text-3xl font-semibold text-[#1c1c1e]">{card.value}</p>
            <div className="mt-4 h-16">
              <ResponsiveContainer>
                <LineChart data={card.data}>
                  <Line type="monotone" dataKey="value" stroke={card.color} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-3xl bg-[#f1f4fb] p-6 shadow-inner">
        <p className="text-sm font-semibold text-[#1c1c1e]">Network Summary</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.title} className="flex items-center gap-4 rounded-2xl bg-white px-4 py-5 shadow">
              <div className="rounded-2xl bg-[#eef1ff] p-3" style={{ color: card.accent }}>
                {card.icon}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#6f7780]">{card.title}</p>
                <p className="text-xl font-semibold text-[#1c1c1e]">{card.value}</p>
                {card.detail && <p className="text-xs text-[#94a3b8]">{card.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-lg font-semibold text-[#1c1c1e]">Conexiones LAN vs remotas</p>
            <p className="text-xs text-[#6f7780]">Compara cuántas pruebas acumulaste por estado en cada tipo de red.</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer>
                <BarChart data={connectionData}>
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis allowDecimals={false} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0' }}
                    formatter={(value: number, name: string) => [`${value} pruebas`, name]}
                  />
                  <Legend />
                  <Bar dataKey="completadas" fill="#4a6cf7" radius={[12, 12, 0, 0]} name="Completadas" stackId="total" />
                  <Bar dataKey="ejecucion" fill="#22c55e" radius={[12, 12, 0, 0]} name="En ejecución" stackId="total" />
                  <Bar dataKey="fallidas" fill="#f43f5e" radius={[12, 12, 0, 0]} name="Fallidas" stackId="total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-lg font-semibold text-[#1c1c1e]">Recent Activity</p>
            <div className="mt-4 divide-y divide-slate-100">
              {recentEvents.map((event) => (
                <div key={event.title} className="flex items-center justify-between py-4 text-sm">
                  <div>
                    <p className="font-semibold text-[#1c1c1e]">{event.title}</p>
                    <p className="text-[#6f7780]">{event.detail}</p>
                  </div>
                  <p className="text-xs text-[#a0a5b1]">{event.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="font-semibold text-[#1c1c1e]">Estado de pruebas</p>
            <div className="mt-4 space-y-3 text-sm text-[#6f7780]">
              <p>Total pruebas: <span className="text-[#1c1c1e]">{tests.length}</span></p>
              <p>En ejecución: {tests.filter((test) => test.status === 'running').length}</p>
              <p>Completadas: {tests.filter((test) => test.status === 'completed').length}</p>
              <p>Fallidas: {tests.filter((test) => test.status === 'failed').length}</p>
              {loading && <p className="text-xs">Actualizando métricas…</p>}
            </div>
          </div>
          <div className="rounded-3xl bg-[#1c1c1e] p-6 text-white shadow-2xl">
            <p className="text-sm uppercase tracking-wide text-white/70">Network Alert</p>
            <p className="mt-2 text-2xl font-semibold">{issueAlert.title}</p>
            <p className="text-4xl font-bold text-[#5d8cff]">{issueAlert.value}</p>
            <p className="mt-2 text-sm text-white/80">{issueAlert.detail}</p>
            <div className="mt-6 h-16">
              <ResponsiveContainer>
                <AreaChart data={[{ x: 0, y: 0 }, { x: 1, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 5 }, { x: 4, y: 3 }]}>
                  <Area type="monotone" dataKey="y" stroke="#ff8a5c" fill="#ff8a5c22" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      {cellMapperSection}
      {livePacket && (
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-sm text-[#6f7780] shadow-sm">
          <p className="font-semibold text-[#1c1c1e]">Actividad en vivo</p>
          <p>
            Paquete #{livePacket.seq} • estado {livePacket.status}
            {livePacket.rtt && ` | RTT ${livePacket.rtt.toFixed(2)} ms`}
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

