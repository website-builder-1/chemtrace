/**
 * Build a deep link to the product (or product-search) page for a given
 * reagent + supplier combination. Used by the procurement table so each
 * reagent row links straight out to where the user can actually buy it.
 *
 * Strategy:
 *   1. If the reagent record provides an explicit `productUrl`, use it.
 *   2. Otherwise build a supplier-specific search URL using the CAS number
 *      (most reliable identifier) or the reagent name as a fallback.
 *   3. If the supplier is unknown, fall back to a Google search.
 */

const SUPPLIER_SEARCH: Record<string, (cas: string, name: string) => string> = {
  'sigma-aldrich': (cas, name) =>
    `https://www.sigmaaldrich.com/US/en/search/${encodeURIComponent(cas || name)}?focus=products&page=1&perpage=30&sort=relevance&term=${encodeURIComponent(cas || name)}&type=product`,
  'merck': (cas, name) =>
    `https://www.sigmaaldrich.com/US/en/search/${encodeURIComponent(cas || name)}?focus=products&page=1&perpage=30&sort=relevance&term=${encodeURIComponent(cas || name)}&type=product`,
  'fisher scientific': (cas, name) =>
    `https://www.fishersci.com/us/en/catalog/search/products?keyword=${encodeURIComponent(cas || name)}`,
  'thermo fisher': (cas, name) =>
    `https://www.thermofisher.com/search/results?query=${encodeURIComponent(cas || name)}&persona=Catalog`,
  'alfa aesar': (cas, name) =>
    `https://www.thermofisher.com/search/results?query=${encodeURIComponent(cas || name)}&persona=Catalog`,
  'tci chemicals': (cas, name) =>
    `https://www.tcichemicals.com/US/en/search/?text=${encodeURIComponent(cas || name)}`,
  'tci': (cas, name) =>
    `https://www.tcichemicals.com/US/en/search/?text=${encodeURIComponent(cas || name)}`,
  'vwr chemicals': (cas, name) =>
    `https://us.vwr.com/store/search?keyword=${encodeURIComponent(cas || name)}`,
  'vwr': (cas, name) =>
    `https://us.vwr.com/store/search?keyword=${encodeURIComponent(cas || name)}`,
  'strem chemicals': (cas, name) =>
    `https://www.strem.com/catalog/family/${encodeURIComponent(cas || name)}/`,
  'strem': (cas, name) =>
    `https://www.strem.com/catalog/family/${encodeURIComponent(cas || name)}/`,
  'boc gases': () =>
    `https://www.boconline.co.uk/en/products-and-supply/specialty-gases/index.html`,
};

export function buildSupplierUrl(supplier: string, cas: string, name: string, productUrl?: string): string {
  if (productUrl) return productUrl;
  const key = supplier.trim().toLowerCase();
  const builder = SUPPLIER_SEARCH[key];
  if (builder) return builder(cas || '', name || '');
  // Generic fallback: search the supplier name + CAS on Google.
  const q = encodeURIComponent(`${supplier} ${cas || name}`);
  return `https://www.google.com/search?q=${q}`;
}
