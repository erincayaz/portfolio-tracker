// ---------------------------------------------------------------------------
// Generic currency conversion helpers
// ---------------------------------------------------------------------------

/**
 * Converts a price from any currency to USD using the rates table.
 * The rates table is keyed by ISO-4217 code and expresses "1 USD = N units".
 *
 * @param {number} price
 * @param {string} fromCurrency  ISO-4217 code, e.g. 'TRY', 'EUR', 'USD'
 * @param {Record<string, number>} rates  e.g. { TRY: 38.5, EUR: 0.92, ... }
 * @returns {number}
 */
export const convertToUSD = (price, fromCurrency, rates) => {
  if (fromCurrency === 'USD' || !fromCurrency) return price;
  const rate = rates[fromCurrency];
  return rate ? price / rate : price;
};

/**
 * Converts a USD amount to any target currency using the rates table.
 *
 * @param {number} usdAmount
 * @param {string} toCurrency   ISO-4217 code
 * @param {Record<string, number>} rates
 * @returns {number}
 */
export const convertFromUSD = (usdAmount, toCurrency, rates) => {
  if (toCurrency === 'USD' || !toCurrency) return usdAmount;
  const rate = rates[toCurrency];
  return rate ? usdAmount * rate : usdAmount;
};

/**
 * Converts a price between any two currencies via USD as the pivot.
 *
 * @param {number} price
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {Record<string, number>} rates
 * @returns {number}
 */
export const convertCurrency = (price, fromCurrency, toCurrency, rates) => {
  if (fromCurrency === toCurrency) return price;
  return convertFromUSD(convertToUSD(price, fromCurrency, rates), toCurrency, rates);
};

// ---------------------------------------------------------------------------
// Legacy helper — kept for backward compatibility with existing consumers.
// New code should use convertToUSD with an explicit currency code.
// ---------------------------------------------------------------------------

/**
 * Converts a single asset price to USD.
 * BIST prices are in TRY, US/CRYPTO prices are already in USD.
 *
 * @param {number} price
 * @param {'BIST' | 'US' | 'CRYPTO'} market
 * @param {number} usdTryRate
 * @returns {number}
 */
export const toUSD = (price, market, usdTryRate) => {
  return market === 'BIST' ? price / usdTryRate : price;
};

/**
 * Normalises the second argument of calculation functions.
 * Accepts either a full rates map { TRY: 38.5, ... } or a plain TRY number (legacy).
 *
 * @param {Record<string, number> | number} ratesOrRate
 * @returns {Record<string, number>}
 */
const toRatesObj = (ratesOrRate) =>
  typeof ratesOrRate === 'object' && ratesOrRate !== null
    ? ratesOrRate
    : { TRY: ratesOrRate ?? 1 };

/**
 * Converts a single asset price to USD, honouring the asset's explicit
 * `currency` field if present and falling back to market-derived logic.
 *
 * @param {number} price
 * @param {{ market: string, currency?: string }} asset
 * @param {Record<string, number>} exchangeRates
 * @returns {number}
 */
export const assetToUSD = (price, asset, exchangeRates) => {
  const rates = toRatesObj(exchangeRates);
  // Prefer explicit per-asset currency (supports custom markets / overrides)
  if (asset.currency && asset.currency !== 'USD') {
    return convertToUSD(price, asset.currency, rates);
  }
  // Fallback: derive from market type for assets without a currency field
  if (asset.market === 'BIST') {
    return convertToUSD(price, 'TRY', rates);
  }
  return price; // already USD
};

/**
 * Calculates the total portfolio value in USD.
 * Accepts either a full rates map or a legacy plain TRY rate number.
 *
 * @param {Array} assets
 * @param {Record<string, number> | number} exchangeRates
 * @returns {number}
 */
export const calculateTotalInUSD = (assets, exchangeRates) => {
  const rates = toRatesObj(exchangeRates);
  return assets.reduce((total, asset) => {
    const priceInUSD = assetToUSD(asset.currentPrice, asset, rates);
    return total + priceInUSD * asset.amount;
  }, 0);
};

/**
 * Calculates the total cost basis in USD (using avgPrice instead of currentPrice).
 * Accepts either a full rates map or a legacy plain TRY rate number.
 *
 * @param {Array} assets
 * @param {Record<string, number> | number} exchangeRates
 * @returns {number}
 */
export const calculateTotalCostInUSD = (assets, exchangeRates) => {
  const rates = toRatesObj(exchangeRates);
  return assets.reduce((total, asset) => {
    const avgPriceInUSD = assetToUSD(asset.avgPrice, asset, rates);
    return total + avgPriceInUSD * asset.amount;
  }, 0);
};

/**
 * Calculates unrealised P&L for a single asset in USD.
 * Accepts either a full rates map or a legacy plain TRY rate number.
 *
 * @param {{ currentPrice: number, avgPrice: number, amount: number, market: string, currency?: string }} asset
 * @param {Record<string, number> | number} exchangeRates
 * @returns {{ pnlUSD: number, pnlPercent: number }}
 */
export const calculateAssetPnL = (asset, exchangeRates) => {
  const rates      = toRatesObj(exchangeRates);
  const currentUSD = assetToUSD(asset.currentPrice, asset, rates);
  const avgUSD     = assetToUSD(asset.avgPrice,     asset, rates);
  const pnlUSD     = (currentUSD - avgUSD) * asset.amount;
  const pnlPercent = avgUSD !== 0 ? ((currentUSD - avgUSD) / avgUSD) * 100 : 0;
  return { pnlUSD, pnlPercent };
};

/**
 * Calculates total unrealised P&L across all assets.
 * Accepts either a full rates map or a legacy plain TRY rate number.
 *
 * @param {Array} assets
 * @param {Record<string, number> | number} exchangeRates
 * @returns {{ totalPnlUSD: number, totalPnlPercent: number }}
 */
export const calculateTotalPnL = (assets, exchangeRates) => {
  const totalValue = calculateTotalInUSD(assets, exchangeRates);
  const totalCost  = calculateTotalCostInUSD(assets, exchangeRates);
  const totalPnlUSD     = totalValue - totalCost;
  const totalPnlPercent = totalCost !== 0 ? (totalPnlUSD / totalCost) * 100 : 0;
  return { totalPnlUSD, totalPnlPercent };
};

// ---------------------------------------------------------------------------
// Generic formatting helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort locale for a given ISO-4217 currency code.
 * Falls back to 'en-US' for currencies without a well-known locale.
 *
 * @param {string} currency
 * @returns {string}
 */
const localeForCurrency = (currency) => {
  const map = {
    USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', TRY: 'tr-TR',
    JPY: 'ja-JP', CAD: 'en-CA', AUD: 'en-AU', CHF: 'de-CH',
  };
  return map[currency] ?? 'en-US';
};

/**
 * Formats a monetary value in any ISO-4217 currency using the matching locale.
 *
 * @param {number} value
 * @param {string} currency  ISO-4217 code, e.g. 'USD', 'EUR', 'TRY'
 * @returns {string}
 */
export const formatCurrency = (value, currency = 'USD') => {
  try {
    return new Intl.NumberFormat(localeForCurrency(currency), {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback: plain number if the browser doesn't know the currency code
    return `${currency} ${value.toFixed(2)}`;
  }
};

/**
 * Formats a number as a USD currency string.
 * @param {number} value
 * @returns {string}
 */
export const formatUSD = (value) => formatCurrency(value, 'USD');

/**
 * Formats a number as a TRY currency string.
 * @param {number} value
 * @returns {string}
 */
export const formatTRY = (value) => formatCurrency(value, 'TRY');

/**
 * Converts a USD-denominated amount to the display currency and formats it.
 * Accepts either the legacy (usdTryRate number) or the new (rates object) API.
 *
 * @param {number} usdAmount
 * @param {string} displayCurrency  ISO-4217 code
 * @param {number | Record<string, number>} ratesOrRate
 *   Pass a full rates map for new code, or a plain TRY number for legacy callers.
 * @returns {string}
 */
export const formatValue = (usdAmount, displayCurrency, ratesOrRate) => {
  if (displayCurrency === 'USD') return formatUSD(usdAmount);

  // Support both legacy (number) and new (object) callers
  const converted = typeof ratesOrRate === 'object'
    ? convertFromUSD(usdAmount, displayCurrency, ratesOrRate)
    : displayCurrency === 'TRY'
      ? usdAmount * ratesOrRate   // legacy path
      : usdAmount;

  return formatCurrency(converted, displayCurrency);
};

/**
 * Formats a P&L percent with a leading + or -.
 *
 * @param {number} percent
 * @returns {string}
 */
export const formatPercent = (percent) =>
  `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;