# Multi-Market Portfolio Tracker (BIST & US Markets)

## Project Overview
A fully functional React application for tracking financial assets across BIST (Borsa Istanbul) and US markets (NASDAQ/NYSE) — and optionally CRYPTO — in a single unified dark-themed dashboard. All asset valuations are calculated and displayed in USD. The app is built, deployed locally, and ready for further feature development.

---

## Tech Stack
| Layer | Library | Notes |
|---|---|---|
| Framework | React 19 + Vite 7 | `npm run dev` on port 5173 |
| State | Zustand 5 + `persist` middleware | Assets persisted to localStorage; exchange rate is NOT persisted (always re-fetched) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Dark zinc-based design system; configured via `vite.config.js` + `@import "tailwindcss"` in `index.css` |
| Data Fetching | Axios | Two instances: `stockApi` (Alpha Vantage) and `currencyApi` (open.er-api.com) |
| Validation | Zod | Used in `AssetForm` for field-level validation |
| Icons | Lucide React | |

---

## Data Sources
| Data | Source | API Key Required |
|---|---|---|
| USD/TRY exchange rate | `https://open.er-api.com/v6/latest/USD` | No — fully free and open |
| Live stock prices | Alpha Vantage (`https://www.alphavantage.co`) | Yes — free key from alphavantage.co (25 req/day). **Not yet wired up** — prices are currently entered manually |
| Portfolio data | localStorage via Zustand `persist` | N/A |

---

## Project Structure

```
src/
├── api/
│   └── axiosConfig.js         # Two Axios instances: stockApi, currencyApi
├── components/
│   └── ui/
│       ├── Badge.jsx           # Market tag: BIST (red), US (blue), CRYPTO (yellow)
│       ├── Button.jsx          # 4 variants (primary/secondary/danger/ghost), 3 sizes, loading state
│       ├── Card.jsx            # Surface wrapper with Card.Header, Card.Body, Card.Footer sub-components
│       ├── Input.jsx           # Text input with label, error message, focus ring
│       ├── Modal.jsx           # Accessible dialog: Escape key, backdrop click, body scroll lock
│       ├── Select.jsx          # Native select with label, error, chevron icon
│       └── index.js            # Barrel export for all ui components
├── features/
│   └── portfolio/
│       ├── AssetForm.jsx       # Add/Edit modal with Zod validation; market toggle (BIST/US/CRYPTO)
│       ├── DashboardStats.jsx  # 3 stat tiles: Total Value, Unrealised P&L, Active Markets
│       ├── PortfolioList.jsx   # Full asset table with edit/delete (delete has confirmation modal)
│       └── index.js            # Barrel export
├── hooks/
│   └── useExchangeRate.js      # Fetches USD/TRY on mount; syncs to Zustand store; exposes { rate, loading, error }
├── store/
│   └── usePortfolioStore.js    # Zustand store: { assets, exchangeRate, addAsset, removeAsset, updateAsset, setExchangeRate }
├── utils/
│   └── calculation.js          # Pure math helpers: toUSD, calculateTotalInUSD, calculateTotalCostInUSD, calculateAssetPnL, calculateTotalPnL, formatUSD, formatPercent
├── App.jsx                     # Root shell: sticky nav, exchange rate pill, error banner, composes DashboardStats + PortfolioList
├── index.css                   # @import "tailwindcss"
└── main.jsx                    # ReactDOM.createRoot entry point
```

---

## Core Logic

### Asset Data Shape
```js
{
  id: number,           // Date.now() at creation
  symbol: string,       // e.g. "AAPL", "THYAO"
  name: string,         // e.g. "Apple Inc."
  market: 'BIST' | 'US' | 'CRYPTO',
  currency: 'TRY' | 'USD',   // derived from market
  amount: number,
  avgPrice: number,     // in the asset's native currency
  currentPrice: number, // in the asset's native currency (manually entered for now)
}
```

### Currency Conversion
- BIST assets: `priceUSD = price / usdTryRate`
- US / CRYPTO assets: `priceUSD = price` (already in USD)
- All conversion flows through `toUSD(price, market, rate)` in `calculation.js`

### State Persistence
- `assets` array is persisted to localStorage under key `portfolio-storage`
- `exchangeRate` is excluded from persistence (`partialize`) so it is always freshly fetched on load

---

## Instructions for the AI Agent
1. **Rules of Hooks:** Never place a hook call after a conditional `return`. All hooks must be called unconditionally at the top of the component.
2. **Prioritize Clean Code:** Follow DRY and SOLID principles.
3. **Type Safety:** Write code as TS-ready — use JSDoc `@param` / `@returns` annotations on all utilities and props documentation on components.
4. **Scalability:** Adding new markets (e.g., Futures, ETFs) must only require updating `MARKETS` array in `AssetForm` and adding a `Badge` variant — no structural changes.
5. **Performance:** Use `useMemo` for all portfolio-wide calculations. Avoid unnecessary re-renders.
6. **No magic numbers:** Exchange rate fallback (`31.50`) and similar constants live as named constants, not inline literals.

---

## Next Steps (Planned)

### 1. Live Price Fetching — `useStockPrice` hook
- Build `src/hooks/useStockPrice.js` using `stockApi` (Alpha Vantage)
- Endpoint: `GET /query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={key}`
- Hook signature: `useStockPrice(symbol, market)` → `{ price, loading, error }`
- On success: call `updateAsset(id, { currentPrice })` to sync the live price into the store
- Needs a `.env` file: `VITE_ALPHA_VANTAGE_KEY=your_key_here`
- Rate limit: 25 req/day on free tier — add a fetch-on-demand button per row in `PortfolioList`