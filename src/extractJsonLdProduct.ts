import { findProductNode, readJsonLd } from "./readJsonLd";

export interface JsonLdProductData {
  title: string;
  imageUrl: string | null;
  priceAmount: string | null;
  priceCurrency: string | null;
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }
    }
  }

  return null;
}

export function extractJsonLdProduct(doc: Document): JsonLdProductData | null {
  const node = findProductNode(readJsonLd(doc));

  if (node === null) {
    return null;
  }

  const title = firstString(node["name"]);

  if (title === null) {
    return null;
  }

  const imageUrl = firstString(node["image"]);
  const offers = node["offers"];

  let priceAmount: string | null = null;
  let priceCurrency: string | null = null;

  if (typeof offers === "object" && offers !== null && !Array.isArray(offers)) {
    const rawPrice = "price" in offers ? offers.price : null;

    if (typeof rawPrice === "string") {
      priceAmount = rawPrice.trim() || null;
    } else if (typeof rawPrice === "number") {
      priceAmount = String(rawPrice);
    }

    priceCurrency =
      "priceCurrency" in offers ? firstString(offers.priceCurrency) : null;
  }

  return {
    title,
    imageUrl,
    priceAmount,
    priceCurrency,
  };
}
