import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Modal, Input, Button, Select } from '../../components/ui';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { COMMON_CURRENCIES } from '../../utils/currencies';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const assetSchema = z.object({
  symbol:       z.string().min(1, 'Symbol is required').max(10).toUpperCase(),
  name:         z.string().min(1, 'Name is required').max(60),
  market:       z.string().min(1, 'Select a market').max(20),
  currency:     z.string().min(2).max(10),
  amount:       z.coerce.number().positive('Must be greater than 0'),
  avgPrice:     z.coerce.number().nonnegative('Cannot be negative'),
  currentPrice: z.coerce.number().nonnegative('Cannot be negative'),
  group:        z.string().max(40).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// MARKETS constant removed — market list is now driven by the Zustand store.
// currencyFor derived from store inside the component via currencyForMarket().

const EMPTY_FORM = {
  symbol:       '',
  name:         '',
  market:       'US',
  currency:     'USD',
  amount:       '',
  avgPrice:     '',
  currentPrice: '',
  group:        '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Modal form for adding a new asset or editing an existing one.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   editAsset?: object | null,   // pass the asset object to enter edit mode
 * }} props
 */
const AssetForm = ({ isOpen, onClose, editAsset = null }) => {
  const addAsset    = usePortfolioStore((s) => s.addAsset);
  const updateAsset = usePortfolioStore((s) => s.updateAsset);
  const assets      = usePortfolioStore((s) => s.assets);
  const markets     = usePortfolioStore((s) => s.markets);

  /** Unique group names already in the portfolio, for datalist autocomplete. */
  const existingGroups = [...new Set(assets.map((a) => a.group).filter(Boolean))];

  /**
   * Returns the default currency for a market id, looking up the store's markets.
   * Falls back to 'USD' if not found.
   * @param {string} marketId
   * @returns {string}
   */
  const currencyForMarket = (marketId) =>
    markets.find((m) => m.id === marketId)?.currency ?? 'USD';

  const [form,   setForm]   = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (editAsset) {
      setForm({
        symbol:       editAsset.symbol       ?? '',
        name:         editAsset.name         ?? '',
        market:       editAsset.market       ?? 'US',
        currency:     editAsset.currency     ?? currencyForMarket(editAsset.market ?? 'US'),
        amount:       String(editAsset.amount       ?? ''),
        avgPrice:     String(editAsset.avgPrice     ?? ''),
        currentPrice: String(editAsset.currentPrice ?? ''),
        group:        editAsset.group        ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [editAsset, isOpen]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const result = assetSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors = {};
      result.error.errors.forEach(({ path, message }) => {
        fieldErrors[path[0]] = message;
      });
      setErrors(fieldErrors);
      return;
    }

    const payload = {
      ...result.data,
      // Store group as trimmed string or undefined if empty
      group: result.data.group?.trim() || undefined,
    };

    if (editAsset) {
      updateAsset(editAsset.id, payload);
    } else {
      addAsset(payload);
    }

    onClose();
  };

  const isEditing = Boolean(editAsset);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Asset' : 'Add Asset'}
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

        {/* Symbol + Market row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label="Symbol"
              placeholder="e.g. AAPL, THYAO"
              value={form.symbol}
              onChange={handleChange('symbol')}
              error={errors.symbol}
            />
          </div>

          {/* Market — toggle buttons on md+, native select on mobile */}
          <div className="hidden sm:flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Market</label>
            <div className="flex flex-wrap gap-1.5">
              {markets.map((market) => (
                <button
                  key={market.id}
                  type="button"
                  onClick={() => {
                    const defaultCurrency = currencyForMarket(market.id);
                    setForm((p) => ({ ...p, market: market.id, currency: defaultCurrency }));
                    setErrors((p) => ({ ...p, market: undefined }));
                  }}
                  className={[
                    'px-3 py-2 rounded-lg text-xs font-semibold border transition-colors duration-150',
                    form.market === market.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500',
                  ].join(' ')}
                >
                  {market.id}
                </button>
              ))}
            </div>
            {errors.market && <p className="text-xs text-red-400">{errors.market}</p>}
          </div>
          <div className="sm:hidden">
            <Select
              label="Market"
              value={form.market}
              onChange={(e) => {
                const m = e.target.value;
                setForm((p) => ({ ...p, market: m, currency: currencyForMarket(m) }));
                setErrors((p) => ({ ...p, market: undefined }));
              }}
              options={markets.map((m) => ({ value: m.id, label: m.id }))}
              error={errors.market}
            />
          </div>
        </div>

        {/* Currency override */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">
            Price Currency
            <span className="ml-1.5 text-xs font-normal text-zinc-500">(override if needed)</span>
          </label>
          <select
            value={form.currency}
            onChange={handleChange('currency')}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors hover:border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {COMMON_CURRENCIES.map(({ code, name, symbol }) => (
              <option key={code} value={code}>{symbol} {code} — {name}</option>
            ))}
          </select>
          {errors.currency && <p className="text-xs text-red-400">{errors.currency}</p>}
        </div>

        {/* Name */}
        <Input
          label="Company / Asset Name"
          placeholder="e.g. Apple Inc."
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
        />

        {/* Group — optional, with autocomplete from existing groups */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">
            Group
            <span className="ml-1.5 text-xs font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            list="group-suggestions"
            placeholder="e.g. Gold, Tech, Real Estate"
            value={form.group}
            onChange={handleChange('group')}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors hover:border-zinc-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <datalist id="group-suggestions">
            {existingGroups.map((g) => <option key={g} value={g} />)}
          </datalist>
          {errors.group && <p className="text-xs text-red-400">{errors.group}</p>}
        </div>

        {/* Numeric fields row */}
        <div className="flex gap-3">
          <Input
            label="Amount"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={form.amount}
            onChange={handleChange('amount')}
            error={errors.amount}
          />
          <Input
            label={`Avg Price (${form.currency})`}
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={form.avgPrice}
            onChange={handleChange('avgPrice')}
            error={errors.avgPrice}
          />
          <Input
            label={`Current Price (${form.currency})`}
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={form.currentPrice}
            onChange={handleChange('currentPrice')}
            error={errors.currentPrice}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {isEditing ? 'Save Changes' : 'Add Asset'}
          </Button>
        </div>

      </form>
    </Modal>
  );
};

export default AssetForm;
