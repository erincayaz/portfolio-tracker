# Multi-Market Portfolio Tracker

## Project Overview
A fully functional React + Vite SPA for tracking financial assets across BIST (Borsa Istanbul), US markets (NASDAQ/NYSE), Crypto, and any custom user-defined market — all in a single dark-themed dashboard. Asset values can be displayed in any currency. The app is deployed on GitHub Pages and uses Google Drive for cloud backup sync. All asset prices are entered manually (no live price fetching).

**Live URL:** `https://<username>.github.io/portfolio-tracker/`  
**Deploy command:** `npm run deploy` (builds then pushes `dist/` to the `gh-pages` branch)

---

## Tech Stack
| Layer | Library | Notes |
|---|---|---|
| Framework | React 19 + Vite 7 | `npm run dev` on port 5173 |
| State | Zustand 5 + `persist` middleware | `assets`, `snapshots`, `displayCurrency`, `markets` persisted to localStorage; `exchangeRates` is NOT persisted (always re-fetched) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Dark zinc-based design system; configured via `vite.config.js` + `@import "tailwindcss"` in `index.css` |
| Data Fetching | Axios | Two instances: `stockApi` (Alpha Vantage, unused) and `currencyApi` (open.er-api.com) |
| Charts | Recharts | Pie chart (allocation), Line chart (historical snapshots) |
| Validation | Zod | Used in `AssetForm` (field validation) and `ImportExport` (backup schema) |
| Icons | Lucide React | |
| Analytics | GoatCounter | Visitor count only — single `<script>` tag in `index.html`, no npm package |

---

## Data Sources
| Data | Source | API Key Required |
|---|---|---|
| Full exchange-rate table (base USD) | `https://open.er-api.com/v6/latest/USD` | No — fully free and open |
| Live stock prices | Alpha Vantage (`https://www.alphavantage.co`) | Yes — **not yet wired up**, prices are entered manually |
| Portfolio data (local) | localStorage via Zustand `persist` | N/A |
| Portfolio data (cloud) | Google Drive REST API (user's own Drive) | `VITE_GOOGLE_CLIENT_ID` in `.env` |

---

## Environment Variables
| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID for Drive sync. See `.env.example` for setup instructions. |

Vite inlines `VITE_*` variables into the bundle at build time. The client ID is intentionally public — Google enforces security via the **Authorized JavaScript Origins** list in the OAuth client settings, not via the ID itself. The client secret is never used.

---

## Project Structure

```
src/
├── api/
│   └── axiosConfig.js          # Two Axios instances: stockApi (Alpha Vantage), currencyApi (open.er-api.com)
├── components/
│   └── ui/
│       ├── Badge.jsx            # Market tag: BIST (red), US (blue), CRYPTO (yellow), custom (zinc)
│       ├── Button.jsx           # 4 variants (primary/secondary/danger/ghost), 3 sizes, loading spinner state
│       ├── Card.jsx             # Surface wrapper with Card.Header, Card.Body, Card.Footer sub-components
│       ├── Input.jsx            # Text input with label, error message, focus ring
│       ├── Modal.jsx            # Accessible dialog: Escape key, backdrop click, body scroll lock
│       ├── Select.jsx           # Native select with label, error, chevron icon
│       └── index.js             # Barrel export for all ui components
├── features/
│   └── portfolio/
│       ├── AllocationChart.jsx  # Recharts PieChart — allocation by asset or group; cycle of 8 slice colours
│       ├── AssetForm.jsx        # Add/Edit modal with Zod validation; market/currency driven from store markets list
│       ├── DashboardStats.jsx   # 4 stat tiles: Total Value, Unrealised P&L, Cost Basis, Active Markets
│       ├── HistoricalChart.jsx  # Recharts LineChart of manual portfolio value snapshots; save/clear controls
│       ├── ImportExport.jsx     # "Backup & Sync" modal: JSON file export/import + Google Drive save/load
│       ├── PortfolioList.jsx    # Full asset table with edit/delete (delete has confirmation modal)
│       ├── Settings.jsx         # Display currency picker + custom market manager (add/remove non-built-in markets)
│       └── index.js             # Barrel export for all portfolio features
├── hooks/
│   ├── useExchangeRate.js       # Fetches full USD-base rates map on mount; syncs to store; returns { rate, rates, loading, error }
│   └── useGoogleDrive.js        # Google Drive sync: signIn/signOut, saveToDrive, loadFromDrive, driveStatus
├── store/
│   └── usePortfolioStore.js     # Zustand store — see "Store Shape" section below
├── utils/
│   ├── calculation.js           # Pure math helpers — see "Calculation Helpers" section below
│   └── currencies.js            # COMMON_CURRENCIES list; symbolForCurrency(), nameForCurrency()
├── App.jsx                      # Root shell: sticky nav (Settings + Backup buttons, rate pill), charts row, PortfolioList
├── index.css                    # @import "tailwindcss"
└── main.jsx                     # ReactDOM.createRoot entry point
```

---

## Store Shape (`usePortfolioStore`)

```js
{
  // ── Persisted (localStorage key: 'portfolio-storage') ──────────────────
  assets:          Asset[],           // all portfolio positions
  snapshots:       Snapshot[],        // historical value snapshots
  displayCurrency: string,            // ISO-4217 code, default 'USD'
  markets:         Market[],          // built-in + user-added markets

  // ── Not persisted (always re-fetched on load) ───────────────────────────
  exchangeRates:   Record<string, number>,  // e.g. { TRY: 38.5, EUR: 0.92 }
  exchangeRate:    number | null,           // legacy USD→TRY shorthand

  // ── Actions ─────────────────────────────────────────────────────────────
  addAsset(asset),
  removeAsset(id),
  updateAsset(id, partial),
  addMarket(market),       // no-op if id already exists
  removeMarket(id),        // built-in markets are protected
  setExchangeRates(rates), // updates full map + legacy exchangeRate
  setExchangeRate(rate),   // legacy single-rate setter
  addSnapshot(snapshot),
  clearSnapshots(),
  setDisplayCurrency(code),
  importData({ assets, snapshots, displayCurrency, markets }),  // full replace
}
```

### Built-in Markets (`DEFAULT_MARKETS`)
```js
[
  { id: 'BIST',   name: 'Borsa Istanbul', currency: 'TRY', builtIn: true },
  { id: 'US',     name: 'US Markets',     currency: 'USD', builtIn: true },
  { id: 'CRYPTO', name: 'Crypto',         currency: 'USD', builtIn: true },
]
```
Users can add custom markets (e.g. `LSE` / `GBP`) via Settings. Custom markets survive page refresh.

---

## Asset Data Shape
```js
{
  id:           number,   // Date.now() at creation
  symbol:       string,   // e.g. "AAPL", "THYAO"
  name:         string,   // e.g. "Apple Inc."
  market:       string,   // any market id — 'BIST', 'US', 'CRYPTO', or custom
  currency:     string,   // ISO-4217 code derived from market (e.g. 'TRY', 'USD', 'GBP')
  amount:       number,
  avgPrice:     number,   // in the asset's native currency
  currentPrice: number,   // in the asset's native currency (manually entered)
  group?:       string,   // optional user-defined grouping label
}
```

---

## Calculation Helpers (`calculation.js`)

| Function | Signature | Notes |
|---|---|---|
| `convertToUSD` | `(price, fromCurrency, rates) → number` | Generic: converts any currency → USD using rates map |
| `convertFromUSD` | `(usdAmount, toCurrency, rates) → number` | Generic: USD → any currency |
| `convertCurrency` | `(price, from, to, rates) → number` | Any → any via USD pivot |
| `assetToUSD` | `(price, asset, exchangeRates) → number` | Honours `asset.currency`; falls back to market-derived logic |
| `toUSD` | `(price, market, usdTryRate) → number` | **Legacy** — kept for backward compat; new code should prefer `assetToUSD` |
| `calculateTotalInUSD` | `(assets, rates) → number` | Sum of all positions in USD |
| `calculateTotalCostInUSD` | `(assets, rates) → number` | Sum of cost bases in USD |
| `calculateAssetPnL` | `(asset, rates) → { pnl, pnlPercent }` | Unrealised P&L for one asset |
| `calculateTotalPnL` | `(assets, rates) → { pnl, pnlPercent }` | Portfolio-wide P&L |
| `formatValue` | `(usdAmount, displayCurrency, rates) → string` | Converts + formats with currency symbol |
| `formatPercent` | `(value) → string` | e.g. `"+3.45%"` |

---

## Google Drive Sync (`useGoogleDrive.js`)

- **Auth:** Google Identity Services (GIS) token flow — browser popup, no backend or redirect URI.
- **Scope:** `drive.file` — only accesses files created by this app.
- **Backup file name:** `portfolio-tracker-backup.json` (created in root of user's Drive).
- **Operations:** `saveToDrive(payload)` (create or PATCH), `loadFromDrive()` (search then GET).
- All Drive calls are plain `fetch` against the Drive REST API — no Google SDK npm package.
- `VITE_GOOGLE_CLIENT_ID` must be set in `.env`. The client ID is safe to bundle; see `.env.example`.
- Token expiry is detected (HTTP 401) — user is prompted to reconnect.

### OAuth setup checklist
1. Google Cloud Console → enable **Google Drive API**
2. OAuth consent screen → scope `../auth/drive.file` → add test users (or publish app)
3. Credentials → OAuth 2.0 Client ID → **Web application**
4. Authorized JavaScript origins: `http://localhost:5173` + `https://<you>.github.io`
5. Client secret is NOT used — only the client ID goes in `.env`

---

## Backup & Sync File Format

```js
{
  version:         1,
  exportedAt:      string,   // ISO-8601
  assets:          Asset[],
  snapshots:       Snapshot[],
  displayCurrency: string,
  markets:         Market[],
}
```
Validated with Zod on import. `market` and `currency` fields accept any string (not an enum) so custom markets round-trip correctly.

---

## Deployment

| Item | Detail |
|---|---|
| Host | GitHub Pages |
| Base path | `/portfolio-tracker/` (set in `vite.config.js`) |
| Deploy command | `npm run deploy` — runs `vite build` then `gh-pages -d dist` |
| Analytics | GoatCounter — `<script>` tag in `index.html`; dashboard at `https://portfolio-tracker.goatcounter.com` |
| Google Drive on prod | Add `https://<you>.github.io` to Authorized JavaScript Origins in GCP Console |

---

## Instructions for the AI Agent
1. **Rules of Hooks:** Never place a hook call after a conditional `return`. All hooks must be called unconditionally at the top of the component.
2. **Prioritize Clean Code:** Follow DRY and SOLID principles.
3. **Type Safety:** Write code as TS-ready — use JSDoc `@param` / `@returns` annotations on all utilities and props documentation on components.
4. **Scalability:** Adding a new market only requires a new entry in the store's `markets` array (or via Settings UI) — no structural code changes needed.
5. **Performance:** Use `useMemo` for all portfolio-wide calculations. Avoid unnecessary re-renders.
6. **No magic numbers:** Fallback rates and similar constants live as named constants (e.g. `FALLBACK_RATES` in `useExchangeRate.js`), not inline literals.
7. **Currency awareness:** All display formatting must go through `formatValue(usdAmount, displayCurrency, rates)`. Never hardcode `$` or assume USD output.
8. **Store imports:** Use `importData()` for full state replacement (backup restore). Never set `assets` / `snapshots` / `markets` directly from outside the store.

---

## Next Steps (Planned)

### 1. Live Price Fetching — `useStockPrice` hook
- Build `src/hooks/useStockPrice.js` using `stockApi` (Alpha Vantage)
- Endpoint: `GET /query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={key}`
- Hook signature: `useStockPrice(symbol, market)` → `{ price, loading, error }`
- On success: call `updateAsset(id, { currentPrice })` to sync the live price into the store
- Needs `.env` entry: `VITE_ALPHA_VANTAGE_KEY=your_key_here`
- Rate limit: 25 req/day on free tier — add a fetch-on-demand button per row in `PortfolioList`