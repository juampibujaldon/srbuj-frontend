import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function SalesChart({ data }) {
  return (
    <div className="card">
      <div className="card-header fw-bold">Ventas (últimos días)</div>
      <div className="card-body" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="c" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0d6efd" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(v) => `AR$ ${Number(v).toLocaleString("es-AR")}`} />
            <Area type="monotone" dataKey="amount" stroke="#0d6efd" fillOpacity={1} fill="url(#c)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
