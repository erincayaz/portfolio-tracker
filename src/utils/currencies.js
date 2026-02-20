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
  { code: 'JPY', name: 'Japanese Yen',    symbol: '¥'  },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$'},
  { code: 'AUD', name: 'Australian Dollar',symbol:'A$' },
  { code: 'CHF', name: 'Swiss Franc',     symbol: 'Fr' },
  { code: 'CNY', name: 'Chinese Yuan',    symbol: '¥'  },
  { code: 'INR', name: 'Indian Rupee',    symbol: '₹'  },
  { code: 'BRL', name: 'Brazilian Real',  symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso',    symbol: '$'  },
  { code: 'SEK', name: 'Swedish Krona',   symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone',    symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty',    symbol: 'zł' },
  { code: 'HUF', name: 'Hungarian Forint',symbol: 'Ft' },
  { code: 'CZK', name: 'Czech Koruna',    symbol: 'Kč' },
  { code: 'ILS', name: 'Israeli Shekel',  symbol: '₪'  },
  { code: 'SGD', name: 'Singapore Dollar',symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar',symbol: 'HK$'},
  { code: 'KRW', name: 'South Korean Won',symbol: '₩'  },
  { code: 'ZAR', name: 'South African Rand',symbol: 'R'},
  { code: 'SAR', name: 'Saudi Riyal',     symbol: 'SR' },
  { code: 'AED', name: 'UAE Dirham',      symbol: 'د.إ'},
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
