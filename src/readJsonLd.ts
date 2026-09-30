export function readJsonLd(doc: Document): unknown[] {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const values: unknown[] = [];

  for (const script of Array.from(scripts)) {
    const text = script.textContent?.trim();

    if (!text) {
      continue;
    }

    try {
      const value: unknown = JSON.parse(text);
      values.push(value);
    } catch {
      continue;
    }
  }

  return values;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasType(node: Record<string, unknown>, type: string): boolean {
  const types = node["@type"];

  return types === type || (Array.isArray(types) && types.includes(type));
}

export function findProductNode(
  values: unknown[],
  pageUrl?: string,
): Record<string, unknown> | null {
  const pending: unknown[] = [...values];
  const products: Record<string, unknown>[] = [];
  const groups: Record<string, unknown>[] = [];

  while (pending.length > 0) {
    const value = pending.shift();

    if (Array.isArray(value)) {
      pending.push(...value);
      continue;
    }

    if (!isRecord(value)) {
      continue;
    }

    if (hasType(value, "Product")) {
      products.push(value);
    }

    if (hasType(value, "ProductGroup")) {
      groups.push(value);
    }

    if ("@graph" in value) {
      pending.push(value["@graph"]);
    }
  }

  if (pageUrl) {
    const skuId = new URL(pageUrl).searchParams.get("skuId");

    if (skuId) {
      for (const group of groups) {
        const rawVariants = group["hasVariant"];
        const variants = Array.isArray(rawVariants)
          ? rawVariants
          : [rawVariants];

        for (const variant of variants) {
          if (
            isRecord(variant) &&
            hasType(variant, "Product") &&
            variant["sku"] === skuId
          ) {
            return variant;
          }
        }
      }
    }
  }

  return products[0] ?? null;
}
