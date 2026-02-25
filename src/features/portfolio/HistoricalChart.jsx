import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Camera, Trash2 } from 'lucide-react';
import { Card, Button } from '../../components/ui';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { calculateTotalInUSD, formatCurrency, convertFromUSD } from '../../utils/calculation';

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

const CustomTooltip = ({ active, payload, label, displayCurrency }) => {
  if (!active || !payload?.length) return null;
  // payload[0].value is already in displayCurrency (converted in chartData)
  return (
    <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-500 mb-1">{label}</p>
      <p className="font-semibold text-zinc-100">
        {formatCurrency(payload[0].value, displayCurrency)}
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Line chart of saved portfolio value snapshots.
 * The user manually triggers a snapshot via the "Save Snapshot" button.
 */
const HistoricalChart = () => {
  const assets          = usePortfolioStore((s) => s.assets);
  const exchangeRates   = usePortfolioStore((s) => s.exchangeRates);
  const snapshots       = usePortfolioStore((s) => s.snapshots);
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency);
  const addSnapshot     = usePortfolioStore((s) => s.addSnapshot);
  const clearSnapshots  = usePortfolioStore((s) => s.clearSnapshots);

  const handleSaveSnapshot = () => {
    const totalUSD = calculateTotalInUSD(assets, exchangeRates);
    const date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: '2-digit',
    });
    addSnapshot({ date, totalUSD });
  };

  /** Convert snapshots to recharts display format based on displayCurrency. */
  const chartData = useMemo(
    () => snapshots.map((s) => ({
      date:  s.date,
      value: convertFromUSD(s.totalUSD, displayCurrency, exchangeRates),
    })),
    [snapshots, displayCurrency, exchangeRates]
  );

  const valueLabel = `Value (${displayCurrency})`;

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Historical Performance</h2>
          <div className="flex items-center gap-2">
            {snapshots.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSnapshots} aria-label="Clear history"
                className="hover:text-red-400 hover:bg-red-500/10">
                <Trash2 size={13} /> Clear
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleSaveSnapshot} disabled={assets.length === 0}>
              <Camera size={13} /> Save Snapshot
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {snapshots.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
            <p className="text-sm">
              {snapshots.length === 0
                ? 'No snapshots yet.'
                : 'Save one more snapshot to see the chart.'}
            </p>
            <p className="text-xs text-zinc-600">
              Click "Save Snapshot" to record today's portfolio value.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                width={70}
              tickFormatter={(v) => {
                  // Format abbreviated axis tick (e.g. "$12k" or "€10k")
                  const sym = displayCurrency === 'USD' ? '$'
                    : displayCurrency === 'EUR' ? '€'
                    : displayCurrency === 'GBP' ? '£'
                    : displayCurrency === 'TRY' ? '₺'
                    : displayCurrency;
                  return `${sym}${(v / 1000).toFixed(0)}k`;
                }}
              />
              <Tooltip
                content={(props) => (
                  <CustomTooltip {...props} displayCurrency={displayCurrency} />
                )}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={valueLabel}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card.Body>
    </Card>
  );
};

export default HistoricalChart;
