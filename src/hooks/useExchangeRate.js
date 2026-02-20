import { useState, useEffect } from 'react';
import { currencyApi } from '../api/axiosConfig';
import { usePortfolioStore } from '../store/usePortfolioStore';

/** Fallback rates used when the API call fails. */
const FALLBACK_RATES = { TRY: 38.50, EUR: 0.92, GBP: 0.79, JPY: 149.0, CAD: 1.36, AUD: 1.53, CHF: 0.90 };

/**
 * Fetches the full exchange-rate table (base USD) once on mount.
 * Syncs all rates into the global Zustand store via `setExchangeRates`.
 *
 * open.er-api.com returns all ~160 currency rates in a single call — no
 * extra requests needed for multi-currency support.
 *
 * @returns {{ rates: Record<string, number>, loading: boolean, error: string|null }}
 */
export const useExchangeRate = () => {
  const setExchangeRates = usePortfolioStore((s) => s.setExchangeRates);

  const [rates,   setRates]   = useState(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response    = await currencyApi.get('/USD');
        const fetchedRates = response.data.rates;          // full map
        setRates(fetchedRates);
        setExchangeRates(fetchedRates);
      } catch (err) {
        console.error("Couldn't fetch exchange rates:", err);
        setError('Exchange rates unavailable — using fallback.');
        setExchangeRates(FALLBACK_RATES);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [setExchangeRates]);

  // Expose the TRY rate separately for the nav-bar pill (backward compat)
  return { rate: rates.TRY ?? FALLBACK_RATES.TRY, rates, loading, error };
};