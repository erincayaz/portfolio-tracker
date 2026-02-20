import { useMemo, useState } from 'react';
import { Pencil, Trash2, PlusCircle, Layers, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { Card, Badge, Button, Modal } from '../../components/ui';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { calculateAssetPnL, assetToUSD, formatValue, formatPercent } from '../../utils/calculation';
import AssetForm from './AssetForm';

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   asset: object,
 *   exchangeRates: Record<string, number>,
 *   displayCurrency: string,
 *   onEdit: (asset: object) => void,
 *   onRemove: (id: number) => void,
 * }} props
 */
const AssetRow = ({ asset, exchangeRates, displayCurrency, onEdit, onRemove }) => {
  const { pnlUSD, pnlPercent } = useMemo(
    () => calculateAssetPnL(asset, exchangeRates),
    [asset, exchangeRates]
  );

  const currentUSD = assetToUSD(asset.currentPrice, asset, exchangeRates);
  const totalUSD   = currentUSD * asset.amount;
  const isPositive = pnlUSD >= 0;

  return (
    <tr className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors duration-100">
      {/* Symbol + Name + optional Group tag */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant={asset.market}>{asset.market}</Badge>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-zinc-100">{asset.symbol}</p>
              {asset.group && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-zinc-700 text-zinc-300 ring-1 ring-zinc-600">
                  {asset.group}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 truncate max-w-[140px]">{asset.name}</p>
          </div>
        </div>
      </td>

      {/* Amount */}
      <td className="px-4 py-3 text-sm text-zinc-300 text-right tabular-nums">
        {asset.amount.toLocaleString()}
      </td>

      {/* Avg Price */}
      <td className="px-4 py-3 text-sm text-zinc-400 text-right tabular-nums hidden sm:table-cell">
        {asset.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        <span className="text-xs text-zinc-600 ml-1">{asset.currency}</span>
      </td>

      {/* Current Price */}
      <td className="px-4 py-3 text-sm text-zinc-300 text-right tabular-nums hidden sm:table-cell">
        {asset.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        <span className="text-xs text-zinc-600 ml-1">{asset.currency}</span>
      </td>

      {/* Total Value */}
      <td className="px-4 py-3 text-sm font-medium text-zinc-100 text-right tabular-nums">
        {formatValue(totalUSD, displayCurrency, exchangeRates)}
      </td>

      {/* P&L */}
      <td className={`px-4 py-3 text-sm font-medium text-right tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        <div>{formatValue(pnlUSD, displayCurrency, exchangeRates)}</div>
        <div className="text-xs">{formatPercent(pnlPercent)}</div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(asset)} aria-label="Edit">
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRemove(asset)} aria-label="Remove"
            className="hover:text-red-400 hover:bg-red-500/10">
            <Trash2 size={14} />
          </Button>
        </div>
      </td>
    </tr>
  );
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const EmptyState = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4 text-zinc-500">
    <Layers size={40} className="opacity-30" />
    <p className="text-sm">No assets yet. Add your first one.</p>
    <Button variant="primary" size="sm" onClick={onAdd}>
      <PlusCircle size={14} /> Add Asset
    </Button>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'value',  label: 'Value' },
  { value: 'pnl',    label: 'P&L %' },
  { value: 'symbol', label: 'Symbol' },
];

/**
 * Full portfolio table with add / edit / remove functionality,
 * plus sort and market filter controls.
 */
const PortfolioList = () => {
  const assets          = usePortfolioStore((s) => s.assets);
  const exchangeRates   = usePortfolioStore((s) => s.exchangeRates);
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency);
  const removeAsset     = usePortfolioStore((s) => s.removeAsset);
  const markets         = usePortfolioStore((s) => s.markets);

  /** 'ALL' + each market id — drives the filter pill row. */
  const marketsFilter = useMemo(
    () => ['ALL', ...markets.map((m) => m.id)],
    [markets]
  );

  const [formOpen,      setFormOpen]      = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [filterMarket,  setFilterMarket]  = useState('ALL');
  const [sortBy,        setSortBy]        = useState('value');

  const handleEdit = (asset) => { setEditTarget(asset); setFormOpen(true); };
  const handleAdd  = () => { setEditTarget(null); setFormOpen(true); };
  const handleClose = () => { setFormOpen(false); setEditTarget(null); };
  const handleRemoveClick   = (asset) => setDeleteTarget(asset);
  const handleRemoveCancel  = () => setDeleteTarget(null);
  const handleRemoveConfirm = () => { if (deleteTarget) removeAsset(deleteTarget.id); setDeleteTarget(null); };

  /** Filtered + sorted asset list, recomputed only when dependencies change. */
  const displayedAssets = useMemo(() => {
    let list = filterMarket === 'ALL'
      ? assets
      : assets.filter((a) => a.market === filterMarket);

    return [...list].sort((a, b) => {
      if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol);
      if (sortBy === 'pnl') {
        const pnlA = (assetToUSD(a.currentPrice, a, exchangeRates) - assetToUSD(a.avgPrice, a, exchangeRates)) / (assetToUSD(a.avgPrice, a, exchangeRates) || 1);
        const pnlB = (assetToUSD(b.currentPrice, b, exchangeRates) - assetToUSD(b.avgPrice, b, exchangeRates)) / (assetToUSD(b.avgPrice, b, exchangeRates) || 1);
        return pnlB - pnlA;
      }
      // default: sort by total USD value descending
      const valA = assetToUSD(a.currentPrice, a, exchangeRates) * a.amount;
      const valB = assetToUSD(b.currentPrice, b, exchangeRates) * b.amount;
      return valB - valA;
    });
  }, [assets, filterMarket, sortBy, exchangeRates]);

  const valueColHeader = `Value (${displayCurrency})`;
  const pnlColHeader   = `P&L (${displayCurrency})`;

  return (
    <>
      <Card>
        <Card.Header>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: title + market filter pills */}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100 mr-1">Portfolio</h2>
              {marketsFilter.map((m) => (
                <button
                  key={m}
                  onClick={() => setFilterMarket(m)}
                  className={[
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150',
                    filterMarket === m
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Right: sort + add */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <ArrowUpDown size={12} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <Button variant="primary" size="sm" onClick={handleAdd}>
                <PlusCircle size={14} /> Add Asset
              </Button>
            </div>
          </div>
        </Card.Header>

        {assets.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  <th className="px-4 py-2">Asset</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right hidden sm:table-cell">Avg Price</th>
                  <th className="px-4 py-2 text-right hidden sm:table-cell">Current Price</th>
                  <th className="px-4 py-2 text-right">{valueColHeader}</th>
                  <th className="px-4 py-2 text-right">{pnlColHeader}</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {displayedAssets.map((asset) => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    exchangeRates={exchangeRates}
                    displayCurrency={displayCurrency}
                    onEdit={handleEdit}
                    onRemove={handleRemoveClick}
                  />
                ))}
                {displayedAssets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                      No assets match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AssetForm
        isOpen={formOpen}
        onClose={handleClose}
        editAsset={editTarget}
      />

      {/* Delete confirmation modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={handleRemoveCancel}
        title="Remove Asset"
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0 mt-0.5">
              <AlertTriangle size={16} />
            </div>
            <p className="text-sm text-zinc-300">
              Remove <span className="font-semibold text-zinc-100">{deleteTarget?.symbol}</span> from
              your portfolio? This cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleRemoveCancel}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleRemoveConfirm}>Remove</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default PortfolioList;
