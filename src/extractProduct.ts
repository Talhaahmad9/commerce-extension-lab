import { extractJsonLdProduct } from "./extractJsonLdProduct";
import type { ProductSnapshot } from "./messages";

function findVisiblePrice(main: Element): string | null {
  const heading = main.querySelector("h1");

  if (!heading) {
    return null;
  }

  for (
    let section = heading.nextElementSibling;
    section;
    section = section.nextElementSibling
  ) {
    if (section.matches("h2, h3")) {
      break;
    }

    const paragraphs = section.matches("p")
      ? [section]
      : Array.from(section.querySelectorAll("p"));

    for (const paragraph of paragraphs) {
      const value = paragraph.textContent?.trim() ?? "";

      if (/^[€£$]\s*\d/.test(value)) {
        return value;
      }
    }
  }

  return null;
}

export function extractProduct(doc: Document): ProductSnapshot | null {
  const main = doc.querySelector("main");
  const structured = extractJsonLdProduct(doc);

  const visibleTitle = main?.querySelector("h1")?.textContent?.trim() || null;
  const title = visibleTitle ?? structured?.title ?? null;

  if (title === null) {
    return null;
  }

  const visiblePrice = main ? findVisiblePrice(main) : null;
  let price = visiblePrice;

  if (price === null && structured?.priceAmount) {
    price = structured.priceCurrency
      ? `${structured.priceAmount} ${structured.priceCurrency}`
      : structured.priceAmount;
  }

  const image = main?.querySelector("img");
  const imageUrl =
    image?.currentSrc || image?.src || structured?.imageUrl || null;

  if (price === null && imageUrl === null) {
    return null;
  }

  return {
    title,
    price,
    imageUrl,
    url: doc.URL,
  };
}
