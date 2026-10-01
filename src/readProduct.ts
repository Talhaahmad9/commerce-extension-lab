import { extractProduct } from "./extractProduct";
import type { ProductSnapshot } from "./messages";

type RecordValue = Record<string, unknown>;

interface ShopifyData {
  variants: RecordValue[];
  options: RecordValue[];
}

const SHOPIFY_ORIGINS = new Set(["https://jenpharm.com"]);

let cached:
  | {
      url: string;
      expiresAt: number;
      promise: Promise<ShopifyData | null>;
    }
  | undefined;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function identifier(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }

  return null;
}

async function fetchShopifyData(url: string): Promise<ShopifyData | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
    });

    if (!response.ok) {
      return null;
    }

    const value: unknown = await response.json();

    if (
      !isRecord(value) ||
      !Array.isArray(value.variants) ||
      !Array.isArray(value.options)
    ) {
      return null;
    }

    if (!value.variants.every(isRecord) || !value.options.every(isRecord)) {
      return null;
    }

    return {
      variants: value.variants,
      options: value.options,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function readShopifyData(pageUrl: string): Promise<ShopifyData | null> {
  const endpoint = new URL(pageUrl);

  if (
    !SHOPIFY_ORIGINS.has(endpoint.origin) ||
    !/^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/products\/[^/]+\/?$/i.test(
      endpoint.pathname,
    )
  ) {
    return null;
  }

  endpoint.pathname = endpoint.pathname.replace(/\/$/, "") + ".js";
  endpoint.search = "";
  endpoint.hash = "";

  if (cached?.url === endpoint.href && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const entry = {
    url: endpoint.href,
    expiresAt: Date.now() + 60_000,
    promise: fetchShopifyData(endpoint.href),
  };

  cached = entry;

  const result = await entry.promise;

  if (result === null && cached === entry) {
    cached = undefined;
  }

  return result;
}

function selectVariant(doc: Document, data: ShopifyData): RecordValue | null {
  const requestedId = new URL(doc.URL).searchParams.get("variant");

  if (requestedId !== null) {
    return (
      data.variants.find((variant) => identifier(variant.id) === requestedId) ??
      null
    );
  }

  if (data.variants.length === 1) {
    return data.variants[0];
  }

  const productVariantIds = new Set(
    data.variants
      .map((variant) => identifier(variant.id))
      .filter((id): id is string => id !== null),
  );

  const matchingIds = new Set<string>();

  for (const input of Array.from(
    doc.querySelectorAll('form[action*="/cart/add"] [name="id"]'),
  )) {
    if (
      (input instanceof HTMLInputElement ||
        input instanceof HTMLSelectElement) &&
      !input.disabled &&
      productVariantIds.has(input.value)
    ) {
      matchingIds.add(input.value);
    }
  }

  if (matchingIds.size !== 1) {
    return null;
  }

  const [selectedId] = matchingIds;

  return (
    data.variants.find((variant) => identifier(variant.id) === selectedId) ??
    null
  );
}

function optionValue(
  data: ShopifyData,
  variant: RecordValue,
  names: RegExp,
): string | null {
  for (const option of data.options) {
    const name = text(option.name);
    const position = option.position;

    if (
      name === null ||
      !names.test(name) ||
      typeof position !== "number" ||
      !Number.isInteger(position) ||
      position < 1 ||
      position > 3
    ) {
      continue;
    }

    const values = variant.options;
    const value = Array.isArray(values)
      ? text(values[position - 1])
      : text(variant[`option${position}`]);

    if (value !== null && value.toLowerCase() !== "default title") {
      return value;
    }
  }

  return null;
}

function standaloneSize(doc: Document): string | null {
  const main = doc.querySelector("main");
  const heading = main?.querySelector("h1");

  if (!main || !heading) {
    return null;
  }

  const values = new Set<string>();
  let passedHeading = false;
  let examined = 0;

  const candidates = main.querySelectorAll("h1, h2, h3, p, span, div");

  for (const element of Array.from(candidates)) {
    if (element === heading) {
      passedHeading = true;
      continue;
    }

    if (!passedHeading) {
      continue;
    }

    if (element.matches("h1, h2, h3")) {
      break;
    }

    if (
      !(element instanceof HTMLElement) ||
      element.getClientRects().length === 0
    ) {
      continue;
    }

    examined += 1;

    if (examined > 80) {
      break;
    }

    const value = element.innerText.trim();

    if (
      value.length <= 40 &&
      /^\d+(?:\.\d+)?\s*(?:gm?|kg|ml|l|oz|capsules?|tablets?)$/i.test(value)
    ) {
      values.add(value);
    }
  }

  return values.size === 1 ? Array.from(values)[0] : null;
}

export async function readProduct(
  doc: Document,
): Promise<ProductSnapshot | null> {
  const pageUrl = doc.URL;
  const initialProduct = extractProduct(doc);

  if (initialProduct === null) {
    return null;
  }

  const shopify = await readShopifyData(pageUrl);

  // Read the latest DOM after the request finishes.
  const product = extractProduct(doc);

  if (product === null || doc.URL !== pageUrl) {
    return product;
  }

  const selected = shopify !== null ? selectVariant(doc, shopify) : null;

  const sku =
    selected !== null ? text(selected.sku) : (product.variant?.sku ?? null);

  const color =
    shopify !== null && selected !== null
      ? (optionValue(shopify, selected, /^(color|colour|shade)$/i) ??
        product.variant?.color ??
        null)
      : (product.variant?.color ?? null);

  const size =
    shopify !== null && selected !== null
      ? (optionValue(shopify, selected, /^size$/i) ??
        product.variant?.size ??
        standaloneSize(doc))
      : (product.variant?.size ?? standaloneSize(doc));

  return {
    ...product,
    variant:
      sku !== null || color !== null || size !== null
        ? { sku, color, size }
        : null,
  };
}
