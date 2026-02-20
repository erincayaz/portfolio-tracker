
import { useState } from 'react';
import { useExchangeRate } from './hooks/useExchangeRate';
import { DashboardStats, PortfolioList, AllocationChart, HistoricalChart, ImportExport, Settings } from './features/portfolio';
import { usePortfolioStore } from './store/usePortfolioStore';
import { TrendingUp, RefreshCw, AlertCircle, ArrowDownUp, Settings2 } from 'lucide-react';

/**
 * Root application shell.
 * Fetches the exchange rate once on mount and syncs it into the global store.
 */
function App() {
  const { loading, error } = useExchangeRate();
  const displayCurrency = usePortfolioStore((s) => s.displayCurrency);
  const exchangeRates   = usePortfolioStore((s) => s.exchangeRates);

  /** Rate for the active display currency (undefined when USD). */
  const displayRate = displayCurrency !== 'USD' ? exchangeRates[displayCurrency] : null;

  const [importExportOpen, setImportExportOpen] = useState(false);
  const [settingsOpen,     setSettingsOpen]     = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* ── Top Nav ── */}
      <header className="border-b border-zinc-800 bg-zinc-900 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <TrendingUp size={20} className="text-blue-400" />
            <span className="font-bold text-sm sm:text-base tracking-tight">Portfolio Tracker</span>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            {/* Settings button */}
            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-800 border border-zinc-700 hover:text-zinc-200 hover:border-zinc-600 transition-colors duration-150 shrink-0"
            >
              <Settings2 size={12} />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Export / Import button */}
            <button
              onClick={() => setImportExportOpen(true)}
              title="Export / Import"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-800 border border-zinc-700 hover:text-zinc-200 hover:border-zinc-600 transition-colors duration-150 shrink-0"
            >
              <ArrowDownUp size={12} />
              <span className="hidden sm:inline">Backup</span>
            </button>

            {/* Exchange rate pill — only shown when display currency isn't USD */}
            {displayCurrency !== 'USD' && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 min-w-0">
                <RefreshCw size={12} className={`shrink-0 ${loading ? 'animate-spin' : ''}`} />
                {loading
                  ? <span className="truncate">Fetching rates…</span>
                  : error
                  ? <span className="text-amber-400 truncate">Fallback rates active</span>
                  : displayRate
                  ? <span className="truncate">USD/{displayCurrency} <strong className="text-zinc-200">{displayRate.toFixed(4)}</strong></span>
                  : null
                }
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="bg-amber-500/10 border-b border-amber-500/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 text-xs text-amber-400">
            <AlertCircle size={13} className="shrink-0" />
            {error} Non-USD asset valuations may be inaccurate.
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <DashboardStats rateLoading={loading} />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AllocationChart />
          <HistoricalChart />
        </div>

        <PortfolioList />
      </main>

      <ImportExport
        isOpen={importExportOpen}
        onClose={() => setImportExportOpen(false)}
      />

      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

    </div>
  );
}

export default App;
