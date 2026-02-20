import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Layers, DollarSign } from 'lucide-react';
import { Card } from '../../components/ui';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import {
  calculateTotalInUSD,
  calculateTotalPnL,
  formatValue,
  formatPercent,
} from '../../utils/calculation';

/** Shimmering placeholder shown while the exchange rate loads. */
const SkeletonTile = () => (
  <Card className="flex-1 min-w-[160px]">
    <Card.Body>
      <div className="flex flex-col gap-2 animate-pulse">
        <div className="h-3 w-20 rounded bg-zinc-700" />
        <div className="h-6 w-28 rounded bg-zinc-700" />
        <div className="h-3 w-14 rounded bg-zinc-800" />
      </div>
    </Card.Body>
  </Card>
);

/**
 * Single stat tile used inside DashboardStats.
 *
 * @param {{ label: string, value: string, sub?: string, positive?: boolean|null, icon: React.ReactNode }} props
 */
const StatTile = ({ label, value, sub, positive, icon }) => {
  const subColor =
    positive === true
      ? 'text-emerald-400'
      : positive === false
      ? 'text-red-400'
      : 'text-zinc-400';

  return (
    <Card className="flex-1 min-w-[160px]">
      <Card.Body className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {label}
          </span>
          <span className="text-xl font-bold text-zinc-100">{value}</span>
          {sub && <span className={`text-xs font-medium ${subColor}`}>{sub}</span>}
        </div>
        <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 shrink-0">
          {icon}
        </div>
      </Card.Body>
    </Card>
  );
};

/**
 * Dashboard summary bar displaying total value, P&L, and asset count.
 * All heavy calculations are memoised.
 */
const DashboardStats = ({ rateLoading = false }) => {
  const assets          = usePortfolioStore((s) => s.assets);
  const exchangeRates   = usePortfolioStore((s) => s.exchangeRates);
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency);

  // All hooks must be called unconditionally — conditional render comes after.
  const totalValueUSD = useMemo(
    () => calculateTotalInUSD(assets, exchangeRates),
    [assets, exchangeRates]
  );

  const { totalPnlUSD, totalPnlPercent } = useMemo(
    () => calculateTotalPnL(assets, exchangeRates),
    [assets, exchangeRates]
  );

  const isPnlPositive = totalPnlUSD > 0 ? true : totalPnlUSD < 0 ? false : null;

  if (rateLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonTile /><SkeletonTile /><SkeletonTile />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatTile
        label="Total Value"
        value={formatValue(totalValueUSD, displayCurrency, exchangeRates)}
        sub={`${assets.length} asset${assets.length !== 1 ? 's' : ''}`}
        icon={<DollarSign size={18} />}
      />

      <StatTile
        label="Unrealised P&L"
        value={formatValue(totalPnlUSD, displayCurrency, exchangeRates)}
        sub={formatPercent(totalPnlPercent)}
        positive={isPnlPositive}
        icon={
          isPnlPositive === false
            ? <TrendingDown size={18} />
            : <TrendingUp size={18} />
        }
      />

      <StatTile
        label="Markets"
        value={[...new Set(assets.map((a) => a.market))].join(' · ') || '—'}
        icon={<Layers size={18} />}
      />
    </div>
  );
};

export default DashboardStats;
