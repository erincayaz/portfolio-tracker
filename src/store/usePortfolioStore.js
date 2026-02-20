import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Default built-in markets shipped with the app.
 * Users can add custom markets on top of these.
 * @type {Array<{ id: string, name: string, currency: string, builtIn?: boolean }>}
 */
export const DEFAULT_MARKETS = [
  { id: 'BIST',   name: 'Borsa Istanbul', currency: 'TRY', builtIn: true },
  { id: 'US',     name: 'US Markets',     currency: 'USD', builtIn: true },
  { id: 'CRYPTO', name: 'Crypto',         currency: 'USD', builtIn: true },
];

export const usePortfolioStore = create(
  persist(
    (set) => ({
      assets: [],

      /**
       * User-configurable market list. Pre-seeded with the 3 built-in markets.
       * Persisted so custom markets survive a page refresh.
       * @type {Array<{ id: string, name: string, currency: string, builtIn?: boolean }>}
       */
      markets: DEFAULT_MARKETS,

      /**
       * Full exchange-rate map keyed by currency code, all relative to USD.
       * e.g. { TRY: 38.5, EUR: 0.92, GBP: 0.79 }
       * Not persisted — always re-fetched on load.
       */
      exchangeRates: {},

      /**
       * Backward-compatible single TRY rate derived from exchangeRates.
       * Kept so existing consumers don't need to change immediately.
       * Not persisted.
       */
      exchangeRate: null,

      /** Portfolio value snapshots for the historical chart. */
      snapshots: [],

      /** Active display currency for all value columns. */
      displayCurrency: 'USD',

      addAsset: (asset) => set((state) => ({
        assets: [...state.assets, { ...asset, id: Date.now() }]
      })),

      removeAsset: (id) => set((state) => ({
        assets: state.assets.filter((a) => a.id !== id)
      })),

      updateAsset: (id, updatedAsset) => set((state) => ({
        assets: state.assets.map((a) => a.id === id ? { ...a, ...updatedAsset } : a)
      })),

      /**
       * Adds a new custom market. Does nothing if a market with the same id already exists.
       * @param {{ id: string, name: string, currency: string }} market
       */
      addMarket: (market) => set((state) => {
        if (state.markets.some((m) => m.id === market.id)) return state;
        return { markets: [...state.markets, market] };
      }),

      /**
       * Removes a custom market by id. Built-in markets cannot be removed.
       * @param {string} id
       */
      removeMarket: (id) => set((state) => ({
        markets: state.markets.filter((m) => m.builtIn || m.id !== id),
      })),

      /**
       * Stores the full rates map returned by open.er-api.com and keeps the
       * legacy `exchangeRate` (USD→TRY) in sync for backward compatibility.
       * @param {Record<string, number>} rates  e.g. { TRY: 38.5, EUR: 0.92, ... }
       */
      setExchangeRates: (rates) => set({
        exchangeRates: rates,
        exchangeRate:  rates.TRY ?? null,
      }),

      /**
       * Legacy single-rate setter — still works but prefer setExchangeRates.
       * @param {number} rate
       */
      setExchangeRate: (rate) => set({ exchangeRate: rate }),

      /**
       * Saves a portfolio value snapshot.
       * @param {{ date: string, totalUSD: number }} snapshot
       */
      addSnapshot: (snapshot) => set((state) => ({
        snapshots: [...state.snapshots, snapshot],
      })),

      /** Clears all historical snapshots. */
      clearSnapshots: () => set({ snapshots: [] }),

      /**
       * Switches the display currency for value columns.
       * @param {string} currency  ISO 4217 code
       */
      setDisplayCurrency: (currency) => set({ displayCurrency: currency }),

      /**
       * Replaces all persisted state with imported data.
       * @param {{ assets: Array, snapshots: Array, displayCurrency: string, markets: Array }} data
       */
      importData: (data) => set({
        assets:          data.assets          ?? [],
        snapshots:       data.snapshots       ?? [],
        displayCurrency: data.displayCurrency ?? 'USD',
        markets:         data.markets         ?? DEFAULT_MARKETS,
      }),
    }),
    {
      name: 'portfolio-storage',
      // exchangeRates / exchangeRate excluded — always re-fetched fresh on load.
      partialize: (state) => ({
        assets:          state.assets,
        snapshots:       state.snapshots,
        displayCurrency: state.displayCurrency,
        markets:         state.markets,
      }),
    }
  )
);