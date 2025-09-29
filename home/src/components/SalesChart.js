import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Brush,
} from "recharts";
import React, { useMemo } from "react";

const fmtARS = (n) =>
  `AR$ ${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card shadow-sm border-0" style={{ pointerEvents: "none" }}>
      <div className="card-body py-2 px-3">
        <div className="small text-muted mb-1">{fmtDate(label)}</div>
        <div className="fw-semibold">{fmtARS(payload[0].value)}</div>
      </div>
    </div>
  );
}

export default function SalesChart({ data = [], title = "Ventas (últimos días)" }) {
  const avg = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((a, b) => a + (b.amount || 0), 0) / data.length;
  }, [data]);

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <span className="fw-bold">{title}</span>
        <span className="badge text-bg-light">
          Promedio: <span className="fw-semibold">{fmtARS(avg)}</span>
        </span>
      </div>

      <div className="card-body" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--app-primary)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--app-primary)" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tickMargin={8} minTickGap={20} />
            <YAxis tickFormatter={(v) => (v ? `AR$ ${Math.round(v / 1000)}k` : "0")} width={60} />
            <Tooltip content={<CustomTooltip />} />

            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke="rgba(47, 157, 102, 0.65)"
                strokeDasharray="4 4"
                label={{ value: "Promedio", position: "insideTopRight", fill: "rgba(47, 157, 102, 0.8)", fontSize: 12 }}
              />
            )}

            <Area type="monotone" dataKey="amount" stroke="var(--app-primary)" strokeWidth={2} fill="url(#salesFill)" activeDot={{ r: 5 }} />
            {data.length > 10 && <Brush dataKey="date" height={24} travellerWidth={8} stroke="var(--app-primary)" />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
