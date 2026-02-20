import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../../components/ui';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { toUSD, formatValue, formatPercent, assetToUSD } from '../../utils/calculation';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Colour palette cycling for slices. */
const SLICE_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds recharts-ready slice data, optionally grouped.
 * @param {Array}  assets
 * @param {Record<string, number>} exchangeRates
 * @param {'asset'|'group'} groupBy
 * @returns {Array<{ name: string, value: number, percent: number }>}
 */
const buildChartData = (assets, exchangeRates, groupBy) => {
  const buckets = {};

  for (const asset of assets) {
    const key = groupBy === 'group' && asset.group
      ? asset.group
      : asset.symbol;
    const value = assetToUSD(asset.currentPrice, asset, exchangeRates) * asset.amount;
    buckets[key] = (buckets[key] ?? 0) + value;
  }

  const entries = Object.entries(buckets).map(([name, value]) => ({ name, value }));
  const total   = entries.reduce((sum, e) => sum + e.value, 0);

  return entries
    .filter((e) => e.value > 0)
    .map((e) => ({ ...e, percent: total > 0 ? e.value / total : 0 }))
    .sort((a, b) => b.value - a.value);
};

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

const CustomTooltip = ({ active, payload, displayCurrency, rate }) => {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0].payload;
  return (
    <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-zinc-100 mb-1">{name}</p>
      <p className="text-zinc-300">{formatValue(value, displayCurrency, rate)}</p>
      <p className="text-zinc-500">{formatPercent(percent * 100)}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Doughnut chart showing each asset's (or group's) share of the total portfolio value.
 */
const AllocationChart = () => {
  const assets          = usePortfolioStore((s) => s.assets);
  const exchangeRates   = usePortfolioStore((s) => s.exchangeRates);
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency);

  /** Whether any asset has a group assigned — controls toggle visibility. */
  const hasGroups = assets.some((a) => a.group);

  const [groupBy, setGroupBy] = useState('asset'); // 'asset' | 'group'

  const data = useMemo(
    () => buildChartData(assets, exchangeRates, groupBy),
    [assets, exchangeRates, groupBy]
  );

  if (data.length === 0) return null;

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Allocation</h2>

          {/* Toggle only visible when at least one asset has a group */}
          {hasGroups && (
            <div className="flex items-center rounded-lg bg-zinc-800 border border-zinc-700 p-0.5">
              {[['asset', 'By Asset'], ['group', 'By Group']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setGroupBy(val)}
                  className={[
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-150',
                    groupBy === val
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={SLICE_COLORS[idx % SLICE_COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip displayCurrency={displayCurrency} rate={exchangeRates} />}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-zinc-400">{value}</span>
              )}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
};

export default AllocationChart;
