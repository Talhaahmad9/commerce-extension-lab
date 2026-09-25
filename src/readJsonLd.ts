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

export function findProductNode(
  values: unknown[],
): Record<string, unknown> | null {
  const pending: unknown[] = [...values];

  while (pending.length > 0) {
    const value = pending.shift();

    if (Array.isArray(value)) {
      for (const item of value) {
        pending.push(item);
      }
      continue;
    }

    if (!isRecord(value)) {
      continue;
    }

    const types = value["@type"];

    if (
      types === "Product" ||
      (Array.isArray(types) && types.includes("Product"))
    ) {
      return value;
    }

    if ("@graph" in value) {
      pending.push(value["@graph"]);
    }
  }

  return null;
}
