"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Dot } from "recharts";
import { brand } from "@/lib/brand";

export interface SeriePonto { data: string; valor: number }

export default function EvolutionChart({ titulo, serie }: { titulo: string; serie: SeriePonto[] }) {
  if (serie.length === 0) {
    return <p className="text-sm text-muted">Sem registros para traçar evolução.</p>;
  }
  const ultimo = serie.length - 1;
  return (
    <div>
      <p className="text-sm text-muted mb-2">{titulo}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={brand.colors.lilac} strokeDasharray="3 3" opacity={0.5} />
          <XAxis dataKey="data" tick={{ fontSize: 12, fill: brand.colors.muted }} />
          <YAxis tick={{ fontSize: 12, fill: brand.colors.muted }} />
          <Tooltip />
          <Line type="monotone" dataKey="valor" stroke={brand.colors.purple} strokeWidth={2}
            dot={(props: any) => (
              <Dot {...props} r={props.index === ultimo ? 6 : 3}
                fill={props.index === ultimo ? brand.colors.gold : brand.colors.purple}
                stroke={brand.colors.gold} strokeWidth={props.index === ultimo ? 2 : 0} />
            )} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
