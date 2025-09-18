export type VariationAttribute = { name: string; option: string };
export type Variation = {
  id: number | string;
  attributes: VariationAttribute[];
  price?: number | string;
  regular_price?: number | string;
  sale_price?: number | string | null;
  stock_status?: string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  image?: { url?: string; alt?: string } | null;
};

export function normalizeAttributeName(name: string): string {
  if (!name) return '';
  let normalized = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (normalized.startsWith('pa')) normalized = normalized.substring(2);
  return normalized;
}

export function normalizeAttributeValue(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim();
}

export function matchVariation(
  selected: Record<string, string>,
  variations: Variation[] | undefined | null
): Variation | null {
  if (!variations || !Array.isArray(variations) || Object.keys(selected).length === 0) return null;

  const selectedEntries = Object.entries(selected);

  const matches = variations.filter((v) => {
    if (!Array.isArray(v.attributes)) return false;
    return selectedEntries.every(([k, val]) =>
      v.attributes.some((a) =>
        normalizeAttributeName(a.name) === normalizeAttributeName(k) &&
        normalizeAttributeValue(a.option) === normalizeAttributeValue(val)
      )
    );
  });

  return matches.length ? matches[0] : null;
}
