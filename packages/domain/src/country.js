/**
 * Country rules (ONB-05). The family's country sets date and number formats, the currency
 * grown-ups see, which 'My seasons' set the seasons unit teaches, and the consent region.
 * This is a product-planning table, not legal advice: the consent wording per region is
 * reviewed by a lawyer before launch.
 */

/**
 * @typedef {object} CountryRules
 * @property {string} code     ISO 3166-1 alpha-2
 * @property {string} name
 * @property {string} locale   for dates and numbers
 * @property {string} currency ISO 4217
 * @property {"east-africa" | "west-africa" | "southern-africa" | "four-seasons"} seasons
 * @property {"kenya-dpa" | "uganda-dppa" | "tanzania-pdpa" | "nigeria-ndpa" | "south-africa-popia" | "uk-gdpr" | "us-coppa" | "strict"} region
 * @property {number} adultAt  age at which a learner manages their own data
 */

/** @type {CountryRules[]} */
export const COUNTRIES = [
  {
    code: "KE",
    name: "Kenya",
    locale: "en-KE",
    currency: "KES",
    seasons: "east-africa",
    region: "kenya-dpa",
    adultAt: 18,
  },
  {
    code: "UG",
    name: "Uganda",
    locale: "en-UG",
    currency: "UGX",
    seasons: "east-africa",
    region: "uganda-dppa",
    adultAt: 18,
  },
  {
    code: "TZ",
    name: "Tanzania",
    locale: "en-TZ",
    currency: "TZS",
    seasons: "east-africa",
    region: "tanzania-pdpa",
    adultAt: 18,
  },
  {
    code: "NG",
    name: "Nigeria",
    locale: "en-NG",
    currency: "NGN",
    seasons: "west-africa",
    region: "nigeria-ndpa",
    adultAt: 18,
  },
  {
    code: "ZA",
    name: "South Africa",
    locale: "en-ZA",
    currency: "ZAR",
    seasons: "southern-africa",
    region: "south-africa-popia",
    adultAt: 18,
  },
  {
    code: "GB",
    name: "United Kingdom",
    locale: "en-GB",
    currency: "GBP",
    seasons: "four-seasons",
    region: "uk-gdpr",
    adultAt: 13,
  },
  {
    code: "US",
    name: "United States",
    locale: "en-US",
    currency: "USD",
    seasons: "four-seasons",
    region: "us-coppa",
    adultAt: 13,
  },
];

/** Anywhere else: the strictest consent and plain international formats. */
export const OTHER = {
  code: "XX",
  name: "Another country",
  locale: "en-GB",
  currency: "USD",
  seasons: "four-seasons",
  region: "strict",
  adultAt: 18,
};

/** @param {string | null | undefined} code @returns {CountryRules} */
export const countryRules = (code) =>
  COUNTRIES.find((c) => c.code === String(code || "").toUpperCase()) || {
    ...OTHER,
    code: String(code || "XX").toUpperCase(),
  };

/**
 * Does moving from one country to another need consent again (ONB-05 scenario 2)?
 * @param {string} from @param {string} to
 */
export const consentChanges = (from, to) => countryRules(from).region !== countryRules(to).region;

/**
 * A date in the family's format, e.g. 24/10/2026 (Kenya, UK) or 10/24/2026 (US).
 * @param {Date | number} d @param {string} country
 */
export const formatDate = (d, country) =>
  new Intl.DateTimeFormat(countryRules(country).locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(d));

/** A price for grown-ups, e.g. "KSh 500.00". @param {number} amount @param {string} country */
export const formatMoney = (amount, country) => {
  const r = countryRules(country);
  return new Intl.NumberFormat(r.locale, { style: "currency", currency: r.currency }).format(amount);
};
