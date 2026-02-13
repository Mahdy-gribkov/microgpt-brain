'use client';

import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { THEME } from '../lib/constants';

interface LossChartProps {
  data: { step: number; loss: number }[];
  onExport?: () => void;
}

export function LossChart({ data, onExport }: LossChartProps) {
  const displayData = data.length > 200
    ? data.filter((_, i) => i % Math.ceil(data.length / 200) === 0 || i === data.length - 1)
    : data;

  const showDots = data.length < 50;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-text">Training Loss</h2>
        {onExport && data.length > 0 && (
          <button
            onClick={onExport}
            className="text-[10px] text-muted hover:text-amber transition-colors px-2 py-0.5 rounded border border-border hover:border-amber/50"
          >
            Export CSV
          </button>
        )}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayData}>
            <defs>
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={THEME.amber} stopOpacity={0.2} />
                <stop offset="95%" stopColor={THEME.amber} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
            <XAxis
              dataKey="step"
              tick={{ fill: THEME.textMuted, fontSize: 10 }}
              stroke={THEME.border}
            />
            <YAxis
              tick={{ fill: THEME.textMuted, fontSize: 10 }}
              stroke={THEME.border}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: THEME.bgCard,
                border: `1px solid ${THEME.border}`,
                borderRadius: '8px',
                fontSize: 12,
              }}
              labelStyle={{ color: THEME.textMuted }}
              itemStyle={{ color: THEME.amber }}
            />
            <Area
              type="monotone"
              dataKey="loss"
              fill="url(#lossGradient)"
              stroke="none"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="loss"
              stroke={THEME.amber}
              strokeWidth={2}
              dot={showDots ? { fill: THEME.amber, r: 2 } : false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
