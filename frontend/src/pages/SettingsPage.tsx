import { FormEvent, useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState(settings);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateSettings(form);
    setStatus('Configuración guardada.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Configuración</h1>
        <p className="text-sm text-slate-400">Define los endpoints para ejecutar el laboratorio desde casa.</p>
      </div>
      <form className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6" onSubmit={handleSubmit}>
        <label className="text-sm text-slate-400">
          URL base de la API (ej. http://localhost:4000/api)
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={form.apiBaseUrl}
            onChange={(event) => setForm({ ...form, apiBaseUrl: event.target.value })}
          />
        </label>
        <label className="text-sm text-slate-400">
          URL del WebSocket (ej. http://localhost:4000)
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={form.wsUrl}
            onChange={(event) => setForm({ ...form, wsUrl: event.target.value })}
          />
        </label>
        <label className="text-sm text-slate-400">
          Path del WebSocket (por defecto /ws)
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={form.wsPath}
            onChange={(event) => setForm({ ...form, wsPath: event.target.value })}
          />
        </label>
        <label className="text-sm text-slate-400">
          URL de CellMapper (embed)
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={form.cellMapperUrl}
            onChange={(event) => setForm({ ...form, cellMapperUrl: event.target.value })}
            placeholder="https://www.cellmapper.net/map?..."
          />
          <p className="mt-1 text-xs text-slate-500">
            Abre CellMapper, ajusta MCC/MNC y zoom, luego pega la URL para verla integrada en el dashboard.
          </p>
        </label>
        <button type="submit" className="rounded-lg bg-sky-500 px-6 py-2 text-sm font-semibold text-slate-950">
          Guardar cambios
        </button>
        {status && <p className="text-xs text-slate-500">{status}</p>}
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
        <p className="font-semibold text-white">Recordatorio Wireshark</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-400">
          <li>UDP (eco): usa el filtro <code className="rounded bg-slate-800 px-1">udp.port == 40000</code></li>
          <li>TCP (eco): usa el filtro <code className="rounded bg-slate-800 px-1">tcp.port == 5050</code></li>
          <li>
            Combina filtros para separar redes: <code className="rounded bg-slate-800 px-1">ip.src == 192.168.0.10 && udp.port == 40000</code>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPage;
