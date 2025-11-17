import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { TestDetail, TestRecord } from '../types/test';
import { exportPacketsToCsv, exportTestToJson } from '../utils/exporters';

const HistoryPage = () => {
  const { settings } = useSettings();
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [modeFilter, setModeFilter] = useState<'ALL' | 'LAN' | 'REMOTE'>('ALL');
  const [networkFilter, setNetworkFilter] = useState('ALL');
  const [selectedTest, setSelectedTest] = useState<TestDetail | null>(null);

  useEffect(() => {
    api.listTests(settings).then(setTests);
  }, [settings]);

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const modeMatches = modeFilter === 'ALL' || test.mode === modeFilter;
      const networkMatches = networkFilter === 'ALL' || test.networkType === networkFilter;
      return modeMatches && networkMatches;
    });
  }, [tests, modeFilter, networkFilter]);

  const openDetail = async (id: string) => {
    const detail = await api.getTestDetail(settings, id);
    setSelectedTest(detail);
  };

  const buildInterpretation = (test: TestDetail) => {
    const jitterLabel = test.jitter < 10 ? 'baja' : test.jitter < 25 ? 'moderada' : 'alta';
    const notes = test.interpretationNotes && test.interpretationNotes.trim().length ? test.interpretationNotes : '';
    return [
      `Se registró una fuerza de señal de ${test.signalStrength} usando ${test.internetDirection} en ${test.bandFrequency}.`,
      `La distancia reportada fue ${test.distanceDescription} y el plan contratado ${test.plan} (${test.signalSource}).`,
      `El RTT promedio fue ${test.avgLatency.toFixed(2)} ms con variación ${jitterLabel} (${test.jitter.toFixed(2)} ms) y pérdida ${test.packetLoss.toFixed(
        2
      )}%.`,
      test.speedtest
        ? `Speedtest Ookla: ${test.speedtest.download.toFixed(2)} Mbps ↓ / ${test.speedtest.upload.toFixed(
            2
          )} Mbps ↑ (ping ${test.speedtest.ping.toFixed(1)} ms).`
        : 'No se registró Speedtest en esta ejecución.',
      notes ? `Notas: ${notes}` : ''
    ]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Historial</h1>
        <p className="text-sm text-slate-400">Consulta todas las pruebas hechas en el semestre.</p>
      </div>

      <div className="flex flex-wrap gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <label className="text-sm text-slate-400">
          Modo
          <select
            className="mt-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value as 'ALL' | 'LAN' | 'REMOTE')}
          >
            <option value="ALL">Todos</option>
            <option value="LAN">LAN</option>
            <option value="REMOTE">Remotas</option>
          </select>
        </label>
        <label className="text-sm text-slate-400">
          Tipo de red
          <select
            className="mt-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={networkFilter}
            onChange={(event) => setNetworkFilter(event.target.value)}
          >
            <option value="ALL">Todos</option>
            {[...new Set(tests.map((test) => test.networkType))].map((network) => (
              <option key={network} value={network}>
                {network}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Modo</th>
              <th className="px-4 py-2 text-left">Tipo de red</th>
              <th className="px-4 py-2 text-left">Latencia promedio</th>
              <th className="px-4 py-2 text-left">Pérdida</th>
              <th className="px-4 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-300">
            {filteredTests.map((test) => (
              <tr key={test.id}>
                <td className="px-4 py-3 font-semibold text-white">{test.name}</td>
                <td className="px-4 py-3">{new Date(test.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{test.mode}</td>
                <td className="px-4 py-3">{test.networkType}</td>
                <td className="px-4 py-3">{test.avgLatency?.toFixed(2)} ms</td>
                <td className="px-4 py-3">{test.packetLoss?.toFixed(2)}%</td>
                <td className="px-4 py-3">
                  <button className="text-sky-400 hover:underline" onClick={() => openDetail(test.id)}>
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTest && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold">{selectedTest.name}</p>
              <p className="text-sm text-slate-400">{selectedTest.location} – {selectedTest.networkType}</p>
            </div>
            <div className="flex gap-2 text-xs">
              <button className="rounded-lg border border-slate-700 px-3 py-1" onClick={() => exportPacketsToCsv(selectedTest)}>
                Exportar CSV
              </button>
              <button className="rounded-lg border border-slate-700 px-3 py-1" onClick={() => exportTestToJson(selectedTest)}>
                Exportar JSON
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
            <p>Latencia promedio: {selectedTest.avgLatency.toFixed(2)} ms</p>
            <p>Throughput: {selectedTest.throughput.toFixed(2)} Mbps</p>
            <p>Pérdida: {selectedTest.packetLoss.toFixed(2)} %</p>
            <p>RTT min: {selectedTest.minLatency.toFixed(2)} ms</p>
            <p>RTT max: {selectedTest.maxLatency.toFixed(2)} ms</p>
            <p>Jitter: {selectedTest.jitter.toFixed(2)} ms</p>
          </div>
          <div className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-3">
            <p>Fuerza de señal: {selectedTest.signalStrength}</p>
            <p>Banda / frecuencia: {selectedTest.bandFrequency}</p>
            <p>Medio de Internet: {selectedTest.internetDirection}</p>
            <p>Distancia: {selectedTest.distanceDescription}</p>
            <p>Plan contratado: {selectedTest.plan}</p>
            <p>Señal de procedencia: {selectedTest.signalSource}</p>
          </div>
          {selectedTest.speedtest && (
            <div className="mt-4 rounded-lg border border-slate-800/60 bg-slate-950/50 p-4 text-xs text-slate-300">
              <p className="text-sm font-semibold text-white">Speedtest adjunto</p>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <p>Ping: {selectedTest.speedtest.ping.toFixed(2)} ms</p>
                <p>Download: {selectedTest.speedtest.download.toFixed(2)} Mbps</p>
                <p>Upload: {selectedTest.speedtest.upload.toFixed(2)} Mbps</p>
                <p>Servidor: {selectedTest.speedtest.server}</p>
                <p>ISP: {selectedTest.speedtest.isp}</p>
                <p className="md:col-span-2">
                  Fecha medición: {new Date(selectedTest.speedtest.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          )}
          <div className="mt-4 rounded-lg bg-slate-950/60 p-4 text-xs text-slate-400">
            <p>Total paquetes: {selectedTest.packetCount}</p>
            <p>Enviados: {selectedTest.packetCount}</p>
            <p>Recibidos: {selectedTest.packets.filter((p) => p.status === 'received').length}</p>
            <p>Perdidos: {selectedTest.packets.filter((p) => p.status === 'lost').length}</p>
          </div>
          <div className="mt-4 rounded-lg border border-slate-800/60 bg-slate-950/60 p-4 text-xs text-slate-300">
            <p className="text-sm font-semibold text-white">Interpretación técnica</p>
            <p className="mt-2 leading-6">{buildInterpretation(selectedTest)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;


