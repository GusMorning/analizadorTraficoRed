interface KpiCardProps {
  title: string;
  value: string;
  sublabel?: string;
  accent?: 'green' | 'blue' | 'orange';
}

const colors = {
  green: 'text-emerald-600',
  blue: 'text-sky-600',
  orange: 'text-amber-600'
};

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, sublabel, accent = 'blue' }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-lg">
    <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
    <p className={`mt-2 text-3xl font-semibold ${colors[accent]}`}>{value}</p>
    {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
  </div>
);
