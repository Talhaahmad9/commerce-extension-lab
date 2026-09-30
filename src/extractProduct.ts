import { extractJsonLdProduct } from "./extractJsonLdProduct";
import type {
  NormalizedPrice,
  PriceConflict,
  ProductSnapshot,
  SelectedVariant,
} from "./messages";

interface VisiblePrice {
  text: string;
  amount: string;
  currency: string | null;
}

const PREFIXED_PRICE =
  /^(?:[$€£]|Rs\.?)\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)/i;

const PRICE_WITH_CURRENCY_CODE =
  /^((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s+(USD|PKR|EUR|GBP|AED|INR|CAD|AUD)\b/i;

function findVisiblePrice(main: Element): VisiblePrice | null {
  const heading = main.querySelector("h1");

  if (!heading) {
    return null;
  }

  let passedHeading = false;

  const candidates = main.querySelectorAll(
    "h1, h2, h3, p, span, b, strong, [data-price], [itemprop='price']",
  );

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

    const text = element.textContent?.trim() ?? "";
    const prefixedMatch = text.match(PREFIXED_PRICE);

    if (prefixedMatch) {
      return {
        text: prefixedMatch[0],
        amount: prefixedMatch[1].replaceAll(",", ""),
        currency: null,
      };
    }

    const codedMatch = text.match(PRICE_WITH_CURRENCY_CODE);

    if (codedMatch) {
      return {
        text: codedMatch[0],
        amount: codedMatch[1].replaceAll(",", ""),
        currency: codedMatch[2].toUpperCase(),
      };
    }
  }

  return null;
}

function findVisibleSize(main: Element): string | null {
  if (!(main instanceof HTMLElement)) {
    return null;
  }

  const lines = main.innerText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = /^Size\s+(.+)$/i.exec(line);

    if (!match) {
      continue;
    }

    const value = match[1].trim();

    if (
      value.length > 0 &&
      value.length <= 80 &&
      !/^(guide|chart|options?|details?)\b/i.test(value)
    ) {
      return value;
    }
  }

  return null;
}

function skuFromImageUrl(url: string): string | null {
  return /\/sku\/s(\d+)(?=\D|$)/i.exec(url)?.[1] ?? null;
}

function imageUrl(image: HTMLImageElement): string {
  return image.currentSrc || image.src;
}

function imageArea(image: HTMLImageElement): number {
  const box = image.getBoundingClientRect();
  return box.width * box.height;
}

function findVisibleImage(
  main: Element,
  title: string,
  selectedSku: string | null,
): HTMLImageElement | null {
  const images = Array.from(main.querySelectorAll("img"));

  if (selectedSku !== null) {
    const matchingImages = images.filter(
      (image) => skuFromImageUrl(imageUrl(image)) === selectedSku,
    );

    const mainImage = matchingImages.find((image) =>
      /-main-zoom\./i.test(imageUrl(image)),
    );

    if (mainImage) {
      return mainImage;
    }

    if (matchingImages.length > 0) {
      return matchingImages.reduce((best, image) =>
        imageArea(image) > imageArea(best) ? image : best,
      );
    }
  }

  if (images.length === 1) {
    return images[0];
  }

  const titleWords = new Set(
    (title.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
      (word) => word.length >= 4,
    ),
  );

  let bestImage: HTMLImageElement | null = null;
  let bestScore = 0;
  let bestArea = 0;

  for (const image of images) {
    const alt = image.alt.toLowerCase();
    const score = Array.from(titleWords).filter((word) =>
      alt.includes(word),
    ).length;

    if (score < 2) {
      continue;
    }

    const area = imageArea(image);

    if (score > bestScore || (score === bestScore && area > bestArea)) {
      bestImage = image;
      bestScore = score;
      bestArea = area;
    }
  }

  return bestImage;
}

function matchesSelectedSku(
  url: string | null,
  selectedSku: string | null,
): boolean {
  if (url === null || selectedSku === null) {
    return true;
  }

  const imageSku = skuFromImageUrl(url);
  return imageSku === null || imageSku === selectedSku;
}

export function extractProduct(doc: Document): ProductSnapshot | null {
  const main = doc.querySelector("main");
  const structured = extractJsonLdProduct(doc);

  const visibleTitle = main?.querySelector("h1")?.textContent?.trim() || null;
  const title = visibleTitle ?? structured?.title ?? null;

  if (title === null) {
    return null;
  }

  const selectedSku = new URL(doc.URL).searchParams.get("skuId");
  const visiblePrice = main ? findVisiblePrice(main) : null;

  const rawStructuredAmount = structured?.priceAmount ?? null;
  const structuredAmount =
    rawStructuredAmount !== null && /^\d+(?:\.\d+)?$/.test(rawStructuredAmount)
      ? rawStructuredAmount
      : null;

  let price = visiblePrice?.text ?? null;

  if (price === null && structuredAmount !== null) {
    price = structured?.priceCurrency
      ? `${structuredAmount} ${structured.priceCurrency}`
      : structuredAmount;
  }

  const pricesAgree =
    visiblePrice !== null &&
    structuredAmount !== null &&
    Number(structuredAmount) === Number(visiblePrice.amount) &&
    (visiblePrice.currency === null ||
      structured?.priceCurrency == null ||
      visiblePrice.currency === structured.priceCurrency.toUpperCase());

  const priceConflict: PriceConflict | null =
    visiblePrice !== null && structuredAmount !== null && !pricesAgree
      ? {
          visiblePrice: visiblePrice.text,
          structuredPrice: structured?.priceCurrency
            ? `${structuredAmount} ${structured.priceCurrency}`
            : structuredAmount,
        }
      : null;

  let normalizedPrice: NormalizedPrice | null = null;

  if (structuredAmount !== null && (visiblePrice === null || pricesAgree)) {
    normalizedPrice = {
      amount: structuredAmount,
      currency: structured?.priceCurrency ?? null,
      source: "json-ld",
    };
  } else if (visiblePrice !== null) {
    normalizedPrice = {
      amount: visiblePrice.amount,
      currency: visiblePrice.currency,
      source: "visible-dom",
    };
  }

  const visibleImage =
    main !== null ? findVisibleImage(main, title, selectedSku) : null;
  const rawVisibleImageUrl = visibleImage ? imageUrl(visibleImage) : null;
  const visibleImageUrl = matchesSelectedSku(rawVisibleImageUrl, selectedSku)
    ? rawVisibleImageUrl
    : null;

  const structuredImageUrl = matchesSelectedSku(
    structured?.imageUrl ?? null,
    selectedSku,
  )
    ? (structured?.imageUrl ?? null)
    : null;

  const productImageUrl = visibleImageUrl ?? structuredImageUrl;

  if (price === null && productImageUrl === null) {
    return null;
  }

  const variantSku = selectedSku ?? structured?.sku ?? null;
  const variantColor = structured?.color ?? null;
  const variantSize =
    structured?.size ?? (main !== null ? findVisibleSize(main) : null);

  const variant: SelectedVariant | null =
    variantSku !== null || variantColor !== null || variantSize !== null
      ? {
          sku: variantSku,
          color: variantColor,
          size: variantSize,
        }
      : null;

  return {
    title,
    price,
    normalizedPrice,
    priceConflict,
    imageUrl: productImageUrl,
    url: doc.URL,
    variant,
    sources: {
      title: visibleTitle !== null ? "visible-dom" : "json-ld",
      price:
        visiblePrice !== null
          ? "visible-dom"
          : price !== null
            ? "json-ld"
            : null,
      imageUrl:
        visibleImageUrl !== null
          ? "visible-dom"
          : productImageUrl !== null
            ? "json-ld"
            : null,
    },
  };
}
