/**
 * Curated list of common currencies with display metadata.
 * ISO-4217 codes that open.er-api.com returns in its rates object.
 *
 * @type {Array<{ code: string, name: string, symbol: string }>}
 */
export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar',       symbol: '$'  },
  { code: 'EUR', name: 'Euro',            symbol: '€'  },
  { code: 'GBP', name: 'British Pound',   symbol: '£'  },
  { code: 'TRY', name: 'Turkish Lira',    symbol: '₺'  },
];

/**
 * Returns the symbol for a given currency code, falling back to the code itself.
 * @param {string} code
 * @returns {string}
 */
export const symbolForCurrency = (code) =>
  COMMON_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;

/**
 * Returns the display name for a given currency code.
 * @param {string} code
 * @returns {string}
 */
export const nameForCurrency = (code) =>
  COMMON_CURRENCIES.find((c) => c.code === code)?.name ?? code;
