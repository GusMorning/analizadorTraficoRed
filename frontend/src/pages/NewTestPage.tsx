import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useRealtime } from '../context/RealtimeContext';
import { CreateTestPayload, FingDevice, PacketProgress, PortScanResult, SpeedtestSnapshot } from '../types/test';

const defaultForm: CreateTestPayload = {
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
  latitude: -12.0464,
  longitude: -77.0428,
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
    key: 'LAN' as const,
    title: 'LAN',
    description: 'Ideal para la misma red o Tailscale local.',
    icon: (
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 9.5 12 4l7 5m-14 5 7-5 7 5-7 5-7-5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    key: 'REMOTE' as const,
    title: 'Remoto',
    description: 'Clientes conectados por Internet o túnel.',
    icon: (
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5 12h14M12 5v14M8 12c0-3.5 1.8-7 4-7s4 3.5 4 7-1.8 7-4 7-4-3.5-4-7Z" stroke="currentColor" strokeWidth="1" />
      </svg>
    )
  }
];

const NewTestPage = () => {
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();
  const { socket } = useRealtime();

  const [form, setForm] = useState<CreateTestPayload>(defaultForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [lastPacket, setLastPacket] = useState<PacketProgress | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [scanRange, setScanRange] = useState('192.168.0.0/24');
  const [scanResults, setScanResults] = useState<FingDevice[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScanMode, setLastScanMode] = useState<'LAN' | 'REMOTE'>('LAN');

  const [speedtestResult, setSpeedtestResult] = useState<SpeedtestSnapshot | null>(null);
  const [speedtestLoading, setSpeedtestLoading] = useState(false);
  const [speedtestError, setSpeedtestError] = useState<string | null>(null);
  const [portRange, setPortRange] = useState('1-1024');
  const [portScanResult, setPortScanResult] = useState<PortScanResult | null>(null);
  const [portScanLoading, setPortScanLoading] = useState(false);
  const [portScanError, setPortScanError] = useState<string | null>(null);

  const handleModeSelect = useCallback((mode: 'LAN' | 'REMOTE') => {
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
    if (!socket) return;
    const handleProgress = (payload: { testId: string; progress: number; packet: PacketProgress }) => {
      if (payload.testId !== activeTestId) return;
      setProgress(Math.round(payload.progress * 100));
      setLastPacket(payload.packet);
    };
    const handleComplete = (payload: { testId: string }) => {
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const payload: CreateTestPayload = {
        ...form,
        speedtest: speedtestResult ?? undefined
      };
      const response = await api.createTest(settings, payload);
      setActiveTestId(response.id);
      setFeedback('Prueba enviada. Se mostrarán los paquetes en vivo en este panel.');
      setProgress(0);
      setLastPacket(null);
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
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
    } catch (error) {
      setScanError((error as Error).message);
    } finally {
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
    } catch (error) {
      setSpeedtestError((error as Error).message);
    } finally {
      setSpeedtestLoading(false);
    }
  };

  const handlePortScan = async () => {
    setPortScanLoading(true);
    setPortScanError(null);
    try {
      const result = await api.portScan(settings, form.targetHost, portRange);
      setPortScanResult(result);
    } catch (error) {
      setPortScanError((error as Error).message);
    } finally {
      setPortScanLoading(false);
    }
  };

  const renderModeCards = () => (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {modeOptions.map((option) => {
        const isActive = form.mode === option.key;
        return (
          <button
            key={option.key}
            type="button"
            className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
              isActive ? 'border-transparent bg-gradient-to-r from-[#4a6cf7] to-[#5d8cff] text-white shadow-lg' : 'border-slate-100 bg-white text-[#1c1c1e]'
            }`}
            onClick={() => handleModeSelect(option.key)}
          >
            <div>
              <p className="text-lg font-semibold">{option.title}</p>
              <p className={`text-sm ${isActive ? 'text-white/80' : 'text-[#6f7780]'}`}>{option.description}</p>
            </div>
            <div className={`rounded-2xl p-3 ${isActive ? 'bg-white/20' : 'bg-[#eef1ff]'}`} style={{ color: isActive ? '#fff' : '#4a6cf7' }}>
              {option.icon}
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderDestinationStep = () => (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-6 shadow">
        <p className="text-sm font-semibold text-[#1c1c1e]">¿Qué IP deseas probar?</p>
        <div className="mt-3 grid gap-3 md:grid-cols-[2fr,1fr]">
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-lg text-[#1c1c1e]"
            value={form.targetHost}
            onChange={(event) => setForm({ ...form, targetHost: event.target.value })}
            required
          />
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-lg text-[#1c1c1e]"
            type="number"
            min={1}
            max={65535}
            value={form.targetPort}
            onChange={(event) => setForm({ ...form, targetPort: Number(event.target.value) })}
            required
          />
        </div>
        <p className="mt-2 text-xs text-[#6f7780]">
          {form.mode === 'LAN'
            ? 'Usa IP privada dentro de tu segmento o la IP de un agente conectado por Tailscale local.'
            : 'Usa IP pública de la otra sede o la IP virtual del túnel remoto.'}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-[#6f7780]">
          Nombre de la prueba
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </label>
        <label className="text-sm text-[#6f7780]">
          Dispositivo que ejecuta la prueba
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={form.device}
            onChange={(event) => setForm({ ...form, device: event.target.value })}
            required
          />
        </label>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow">
        <p className="text-sm font-semibold text-[#1c1c1e]">Selecciona el modo de conexión</p>
        {renderModeCards()}
        <p className="mt-3 text-xs text-[#6f7780]">
          El escáner y el dashboard agruparán esta prueba como {form.mode === 'LAN' ? 'LAN local' : 'Remota / Internet'}.
        </p>
      </div>
    </div>
  );

  const renderTransportStep = () => (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-6 shadow">
        <p className="text-sm font-semibold text-[#1c1c1e]">Transporte y temporización</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[#6f7780]">
            Protocolo
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.protocol}
              onChange={(event) => setForm({ ...form, protocol: event.target.value as CreateTestPayload['protocol'] })}
            >
              <option value="UDP">UDP 40000 (Wireshark: udp.port == 40000)</option>
              <option value="TCP">TCP 5050 (Wireshark: tcp.port == 5050)</option>
            </select>
          </label>
          <label className="text-sm text-[#6f7780]">
            Intervalo entre paquetes (ms)
            <input
              type="number"
              min={10}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.intervalMs}
              onChange={(event) => setForm({ ...form, intervalMs: Number(event.target.value) })}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm text-[#6f7780]">
            Tamaño de paquete (bytes)
            <input
              type="number"
              min={32}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.packetSize}
              onChange={(event) => setForm({ ...form, packetSize: Number(event.target.value) })}
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Número de paquetes
            <input
              type="number"
              min={5}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.packetCount}
              onChange={(event) => setForm({ ...form, packetCount: Number(event.target.value) })}
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Dirección / referencia
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.internetDirection}
              onChange={(event) => setForm({ ...form, internetDirection: event.target.value })}
            />
          </label>
        </div>
      </div>
    </div>
  );

  const renderMetadataStep = () => (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-6 shadow">
        <p className="text-sm font-semibold text-[#1c1c1e]">Describe la red y el contexto</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[#6f7780]">
            Tipo de red
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.networkType}
              onChange={(event) => setForm({ ...form, networkType: event.target.value })}
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Operador / ISP
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.provider}
              onChange={(event) => setForm({ ...form, provider: event.target.value })}
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Ubicación
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Latitud (decimal)
            <input
              type="number"
              step="0.000001"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.latitude ?? ''}
              onChange={(event) =>
                setForm({
                  ...form,
                  latitude: event.target.value === '' ? undefined : Number(event.target.value)
                })
              }
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Longitud (decimal)
            <input
              type="number"
              step="0.000001"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.longitude ?? ''}
              onChange={(event) =>
                setForm({
                  ...form,
                  longitude: event.target.value === '' ? undefined : Number(event.target.value)
                })
              }
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Intensidad de señal (dBm)
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.signalStrength}
              onChange={(event) => setForm({ ...form, signalStrength: event.target.value })}
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Banda / frecuencia
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.bandFrequency}
              onChange={(event) => setForm({ ...form, bandFrequency: event.target.value })}
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Distancia / referencia
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.distanceDescription}
              onChange={(event) => setForm({ ...form, distanceDescription: event.target.value })}
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Plan contratado
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.plan}
              onChange={(event) => setForm({ ...form, plan: event.target.value })}
            />
          </label>
          <label className="text-sm text-[#6f7780]">
            Fuente de señal / referencia regulatoria
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.signalSource}
              onChange={(event) => setForm({ ...form, signalSource: event.target.value })}
            />
          </label>
        </div>
        <label className="mt-4 block text-sm text-[#6f7780]">
          Notas para el informe
          <textarea
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            rows={3}
            value={form.interpretationNotes}
            onChange={(event) => setForm({ ...form, interpretationNotes: event.target.value })}
          />
        </label>
      </div>
    </div>
  );

  const renderToolsStep = () => {
    const scanTitle = form.mode === 'LAN' ? 'Escáner LAN' : 'Escáner remoto';
    const scanDescription =
      form.mode === 'LAN'
        ? 'Busca agentes dentro de tu segmento local (192.168.x.x). Recomendado cuando ambos equipos están en la misma casa/laboratorio.'
        : 'Escanea rangos públicos o direcciones de túnel (Tailscale 100.64.0.0/10) para ubicar agentes remotos.';
    const scanPlaceholder = form.mode === 'LAN' ? '192.168.0.0/24' : '100.64.0.0/24';

    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-[#050b23] p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{scanTitle}</p>
              <p className="text-xs text-white/70">{scanDescription}</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
              Último escaneo: {lastScanMode === 'LAN' ? 'LAN' : 'Remoto'}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
            <label className="flex-1 text-xs text-white/70">
              Rango CIDR
              <input
                className="mt-1 w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-white"
                placeholder={scanPlaceholder}
                value={scanRange}
                onChange={(event) => setScanRange(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              onClick={handleScanNetwork}
              disabled={scanLoading}
            >
              {scanLoading ? 'Escaneando...' : `Escanear ${form.mode === 'LAN' ? 'LAN' : 'Remoto'}`}
            </button>
          </div>
          {scanError && <p className="mt-2 text-xs text-rose-300">{scanError}</p>}
          <div className="mt-3 grid gap-3 text-xs text-white/90 md:grid-cols-2">
            {scanResults.length ? (
              scanResults.slice(0, 6).map((device) => (
                <button
                  type="button"
                  key={`${device.ip}-${device.mac ?? device.hostname ?? 'device'}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-left transition hover:bg-white/20"
                  onClick={() => setForm({ ...form, targetHost: device.ip })}
                >
                  <div className="rounded-2xl bg-white/30 p-2 text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M5 20a7 7 0 0 1 14 0M8 20a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="12" cy="20" r="1.3" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{device.ip}</p>
                    <p className="text-[11px] text-white/70">{device.hostname ?? device.vendor ?? 'Dispositivo detectado'}</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-xs text-white/70 md:col-span-2">Ejecuta el escaneo para sugerir IPs disponibles.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1c1c1e]">PortDroid · Escaneo de puertos</p>
              <p className="text-xs text-[#6f7780]">Analiza servicios abiertos en {form.targetHost}.</p>
            </div>
            <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-xs text-[#4a6cf7]">
              {portScanResult ? `${portScanResult.ports.length} hallazgos` : 'Sin datos'}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
            <label className="flex-1 text-xs text-[#6f7780]">
              Rango de puertos (ej. 1-1024 o 22,80,443)
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={portRange}
                onChange={(event) => setPortRange(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="rounded-xl bg-[#0ea5e9] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              onClick={handlePortScan}
              disabled={portScanLoading}
            >
              {portScanLoading ? 'Escaneando...' : 'Escanear puertos'}
            </button>
          </div>
          {portScanError && <p className="mt-2 text-xs text-rose-500">{portScanError}</p>}
          <div className="mt-3 grid gap-3 text-xs text-[#1c1c1e] md:grid-cols-2">
            {portScanResult && portScanResult.ports.length ? (
              portScanResult.ports.slice(0, 8).map((entry) => (
                <div
                  key={`${entry.port}-${entry.protocol}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#f8fafc] px-3 py-2"
                >
                  <div
                    className={`h-8 w-8 rounded-2xl text-center text-sm font-semibold leading-8 ${
                      entry.state === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {entry.port}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {entry.state.toUpperCase()} · {entry.protocol}
                    </p>
                    {entry.service && <p className="text-[11px] text-[#6f7780]">{entry.service}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#6f7780] md:col-span-2">Ejecuta un escaneo para mostrar puertos detectados.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow">
          <p className="text-sm font-semibold text-[#1c1c1e]">Speedtest CLI</p>
          <p className="text-xs text-[#6f7780]">Mide con Ookla y adjunta el resultado para el dashboard.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-[#4a6cf7] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              onClick={handleRunSpeedtest}
              disabled={speedtestLoading}
            >
              {speedtestLoading ? 'Midiendo...' : 'Ejecutar Speedtest'}
            </button>
            {speedtestResult && (
              <button
                type="button"
                className="rounded-xl border border-rose-200 px-3 py-2 text-xs text-rose-500"
                onClick={() => {
                  setSpeedtestResult(null);
                  setForm((prev) => ({ ...prev, speedtest: null }));
                }}
              >
                Limpiar
              </button>
            )}
            {speedtestError && <p className="text-xs text-rose-500">{speedtestError}</p>}
          </div>
          {speedtestResult && (
            <div className="mt-4 grid gap-4 text-xs text-[#6f7780] md:grid-cols-3">
              <div className="rounded-2xl bg-[#f7f8fa] p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-[#6f7780]">Ping</p>
                <p className="text-xl font-semibold text-[#1c1c1e]">{speedtestResult.ping.toFixed(2)} ms</p>
              </div>
              <div className="rounded-2xl bg-[#f7f8fa] p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-[#6f7780]">Download</p>
                <p className="text-xl font-semibold text-[#1c1c1e]">{speedtestResult.download.toFixed(2)} Mbps</p>
              </div>
              <div className="rounded-2xl bg-[#f7f8fa] p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-[#6f7780]">Upload</p>
                <p className="text-xl font-semibold text-[#1c1c1e]">{speedtestResult.upload.toFixed(2)} Mbps</p>
              </div>
              <p>Servidor: <span className="text-[#1c1c1e]">{speedtestResult.server}</span></p>
              <p>ISP: <span className="text-[#1c1c1e]">{speedtestResult.isp}</span></p>
              <p className="md:col-span-3">Tomado: {new Date(speedtestResult.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold text-[#1c1c1e]">Resumen para lanzar la prueba</p>
          <ul className="mt-3 space-y-1 text-sm text-[#6f7780]">
          <li><strong>Destino:</strong> {form.targetHost}:{form.targetPort}</li>
          <li><strong>Modo:</strong> {form.mode} - {form.protocol}</li>
          <li><strong>Paquetes:</strong> {form.packetCount} x {form.packetSize} bytes cada {form.intervalMs} ms</li>
          <li><strong>Red:</strong> {form.networkType} - {form.provider}</li>
          {form.latitude !== undefined && form.longitude !== undefined && (
            <li>
              <strong>Coordenadas:</strong> {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
            </li>
          )}
        </ul>
          <p className="mt-2 text-xs text-[#94a3b8]">Filtros sugeridos en Wireshark: udp.port == 40000 o tcp.port == 5050.</p>
        </div>
      </div>
    );
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
  }, [
    currentStep,
    form,
    scanRange,
    scanResults,
    scanLoading,
    scanError,
    speedtestResult,
    speedtestLoading,
    speedtestError,
    lastScanMode,
    portRange,
    portScanResult,
    portScanLoading,
    portScanError
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[#1c1c1e]">Nueva prueba</h1>
        <p className="text-sm text-[#6f7780]">Configura pruebas LAN y remotas para comparar latencia, jitter y Speedtest.</p>
      </div>

      <form className="space-y-6 rounded-3xl bg-white p-6 shadow" onSubmit={handleSubmit}>
        <div className="flex flex-wrap items-center gap-3">
          {steps.map((step, index) => (
            <button
              type="button"
              key={step.title}
              className={`flex-1 rounded-2xl px-4 py-3 text-left text-sm transition ${
                index === currentStep ? 'bg-[#4a6cf7] text-white shadow' : 'bg-slate-50 text-[#6f7780] hover:bg-white'
              }`}
              onClick={() => setCurrentStep(index)}
            >
              <p className="font-semibold">{step.title}</p>
              <p className="text-xs">{step.subtitle}</p>
            </button>
          ))}
        </div>

        {stepContent}

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-[#1c1c1e] disabled:opacity-50"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            disabled={currentStep === 0}
          >
            Anterior
          </button>
          {currentStep === steps.length - 1 ? (
            <button
              type="submit"
              className="rounded-xl bg-[#4a6cf7] px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Enviando...' : 'Iniciar prueba'}
            </button>
          ) : (
            <button type="submit" className="rounded-xl bg-[#4a6cf7] px-6 py-2 text-sm font-semibold text-white">
              Siguiente
            </button>
          )}
        </div>
      </form>

      <div className="rounded-3xl bg-white p-6 shadow">
        <p className="font-semibold text-[#1c1c1e]">Progreso en tiempo real</p>
        {activeTestId ? (
          <div className="mt-4 space-y-2 text-sm text-[#6f7780]">
            <div className="h-3 w-full rounded-full bg-slate-200">
              <div className="h-3 rounded-full bg-[#4a6cf7]" style={{ width: `${progress}%` }} />
            </div>
            <p>{progress}% completado</p>
            {lastPacket && (
              <p>
                Último paquete #{lastPacket.seq} - estado {lastPacket.status}
                {lastPacket.rtt && ` | RTT ${lastPacket.rtt.toFixed(2)} ms`}
              </p>
            )}
            <p className="text-xs text-[#94a3b8]">Filtra en Wireshark: udp.port == 40000 o tcp.port == 5050.</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#6f7780]">Inicia una prueba para ver el progreso aquí.</p>
        )}
        {feedback && <p className="mt-4 text-xs text-[#6f7780]">{feedback}</p>}
      </div>
    </div>
  );
};

export default NewTestPage;
