interface KpiCardProps {
  title: string;
  value: string;
  sublabel?: string;
  accent?: 'green' | 'blue' | 'orange';
}

const colors = {
  green: 'text-emerald-400',
  blue: 'text-sky-400',
  orange: 'text-amber-400'
};

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, sublabel, accent = 'blue' }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <p className="text-sm text-slate-400">{title}</p>
    <p className={`mt-2 text-3xl font-semibold ${colors[accent]}`}>{value}</p>
    {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
  </div>
);
