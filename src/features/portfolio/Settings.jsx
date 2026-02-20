import { useMemo, useState } from 'react';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import { Modal, Button } from '../../components/ui';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { COMMON_CURRENCIES } from '../../utils/currencies';

// ---------------------------------------------------------------------------
// ManageMarkets — add / remove user-defined markets
// ---------------------------------------------------------------------------

const EMPTY_MARKET = { id: '', name: '', currency: 'USD' };

/**
 * @param {{ markets: Array, onAdd: Function, onRemove: Function }} props
 */
const ManageMarkets = ({ markets, onAdd, onRemove }) => {
  const [form,  setForm]  = useState(EMPTY_MARKET);
  const [error, setError] = useState('');

  const handleAdd = () => {
    const id = form.id.trim().toUpperCase();
    if (!id) { setError('ID is required'); return; }
    if (id.length > 10) { setError('ID must be 10 chars or fewer'); return; }
    if (markets.some((m) => m.id === id)) { setError('Market ID already exists'); return; }
    onAdd({ id, name: form.name.trim() || id, currency: form.currency });
    setForm(EMPTY_MARKET);
    setError('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-zinc-200">Markets</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          Add custom markets (e.g. LSE, ASX). Built-in markets cannot be removed.
        </p>
      </div>

      {/* Existing markets */}
      <div className="flex flex-col gap-1.5">
        {markets.map((market) => (
          <div key={market.id} className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200 w-14">{market.id}</span>
              <span className="text-xs text-zinc-500">{market.name}</span>
              <span className="text-xs text-zinc-600">· {market.currency}</span>
            </div>
            {!market.builtIn && (
              <button
                type="button"
                onClick={() => onRemove(market.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors shrink-0 p-1 rounded hover:bg-red-500/10"
                aria-label={`Remove ${market.id}`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add new market */}
      <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">Add a new market</p>
        <div className="flex gap-2 flex-wrap">
          <input
            placeholder="ID (e.g. LSE)"
            value={form.id}
            onChange={(e) => { setForm((p) => ({ ...p, id: e.target.value })); setError(''); }}
            maxLength={10}
            className="w-24 rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            placeholder="Name (optional)"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="flex-1 min-w-0 rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={form.currency}
            onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
            className="rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 outline-none focus:ring-1 focus:ring-blue-500"
          >
            {COMMON_CURRENCIES.map(({ code }) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={handleAdd}>
            <Plus size={12} /> Add
          </Button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CurrencyGrid — renders a grid of selectable currency pills
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   label: string,
 *   description: string,
 *   value: string,
 *   onChange: (code: string) => void,
 *   availableRates: Record<string, number>,
 * }} props
 */
const CurrencyGrid = ({ label, description, value, onChange, availableRates }) => {
  // Show currencies that the API actually returned rates for; always include USD as fallback.
  const available = useMemo(() => {
    const hasRates = Object.keys(availableRates).length > 0;
    return COMMON_CURRENCIES.filter(
      (c) => !hasRates || c.code === 'USD' || availableRates[c.code]
    );
  }, [availableRates]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {available.map(({ code, symbol }) => {
          const isSelected = value === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => onChange(code)}
              className={[
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2',
                'text-xs font-medium transition-colors duration-150',
                isSelected
                  ? 'bg-blue-600 text-white ring-1 ring-blue-500'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700',
              ].join(' ')}
            >
              <span className="text-base leading-none">{symbol}</span>
              <span className="text-[10px] tracking-wide">{code}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// RatePreview — shows live rates for the selected currency
// ---------------------------------------------------------------------------

/**
 * @param {{ currency: string, rates: Record<string, number> }} props
 */
const RatePreview = ({ currency, rates }) => {
  if (currency === 'USD' || !rates[currency]) return null;
  const rate = rates[currency];
  return (
    <p className="text-xs text-zinc-500 mt-1">
      Live rate: <span className="text-zinc-300 font-medium">1 USD = {rate.toFixed(4)} {currency}</span>
    </p>
  );
};

// ---------------------------------------------------------------------------
// Settings modal
// ---------------------------------------------------------------------------

/**
 * Application settings modal.
 * Currently covers display currency and home currency preferences.
 *
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
const Settings = ({ isOpen, onClose }) => {
  const exchangeRates      = usePortfolioStore((s) => s.exchangeRates);
  const displayCurrency    = usePortfolioStore((s) => s.displayCurrency);
  const markets            = usePortfolioStore((s) => s.markets);
  const setDisplayCurrency = usePortfolioStore((s) => s.setDisplayCurrency);
  const addMarket          = usePortfolioStore((s) => s.addMarket);
  const removeMarket       = usePortfolioStore((s) => s.removeMarket);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-1">

        {/* Icon + intro */}
        <div className="flex items-center gap-3 pb-1 border-b border-zinc-800">
          <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
            <Settings2 size={16} />
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Personalise how your portfolio values are displayed. Exchange rates are
            fetched live from <span className="text-zinc-300">open.er-api.com</span> on
            every page load.
          </p>
        </div>

        {/* Currency */}
        <CurrencyGrid
          label="Display Currency"
          description="All portfolio values will be shown in this currency."
          value={displayCurrency}
          onChange={setDisplayCurrency}
          availableRates={exchangeRates}
        />
        <RatePreview currency={displayCurrency} rates={exchangeRates} />

        {/* Markets management */}
        <div className="pt-1 border-t border-zinc-800">
          <ManageMarkets
            markets={markets}
            onAdd={addMarket}
            onRemove={removeMarket}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1 border-t border-zinc-800">
          <Button variant="primary" size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
};

export default Settings;
