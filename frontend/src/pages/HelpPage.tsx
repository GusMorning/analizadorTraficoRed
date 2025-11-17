const HelpPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-semibold">Ayuda rápida</h1>
      <p className="text-sm text-slate-400">
        Guía resumida para desplegar el servidor, el agente remoto y capturar evidencia para el informe.
      </p>
    </div>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
      <h2 className="text-lg font-semibold text-white">1. Backend + Dashboard</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-slate-400">
        <li>Instala dependencias en <code className="rounded bg-slate-800 px-1">/backend</code> y <code className="rounded bg-slate-800 px-1">/frontend</code>.</li>
        <li>Levanta el servidor con <code className="rounded bg-slate-800 px-1">npm run dev:server</code>.</li>
        <li>Levanta el dashboard con <code className="rounded bg-slate-800 px-1">npm run dev</code> y entra a <code className="rounded bg-slate-800 px-1">http://localhost:5173</code>.</li>
      </ol>
    </section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
      <h2 className="text-lg font-semibold text-white">2. Cliente remoto</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-slate-400">
        <li>En la computadora remota edita la variable <code className="rounded bg-slate-800 px-1">SERVER_URL</code> para apuntar al backend.</li>
        <li>Ejecuta <code className="rounded bg-slate-800 px-1">npm run dev:agent</code>. Verás los puertos UDP 40000 y TCP 5050 escuchando.</li>
        <li>
          Desde el dashboard lanza dos pruebas cambiando solo la IP destino para comparar LAN vs Internet. Incluye capturas de pantalla.
        </li>
      </ol>
    </section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
      <h2 className="text-lg font-semibold text-white">3. Wireshark</h2>
      <p className="mt-2 text-slate-400">Filtros sugeridos:</p>
      <ul className="mt-2 list-disc space-y-2 pl-6 text-slate-400">
        <li><code className="rounded bg-slate-800 px-1">udp.port == 40000</code> para los paquetes de prueba UDP.</li>
        <li><code className="rounded bg-slate-800 px-1">tcp.port == 5050</code> para los paquetes TCP.</li>
        <li>Combina con <code className="rounded bg-slate-800 px-1">ip.addr == &lt;IP del agente&gt;</code> para aislar pruebas remotas.</li>
      </ul>
      <p className="mt-4 text-xs text-slate-500">
        Incluye capturas de Wireshark mostrando RTT, número de secuencia y diferencias LAN vs Internet para tu informe final.
      </p>
    </section>
  </div>
);

export default HelpPage;
