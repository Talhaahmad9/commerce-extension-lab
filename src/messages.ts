export interface PingRequest {
  type: "PING";
}

export interface PingResponse {
  type: "PONG";
  message: string;
}

export interface PageInfoRequest {
  type: "GET_PAGE_INFO";
}

export interface PageInfoResponse {
  type: "PAGE_INFO";
  title: string;
  url: string;
}

export type ProductValueSource = "visible-dom" | "json-ld";

export interface NormalizedPrice {
  amount: string;
  currency: string | null;
  source: ProductValueSource;
}

export interface PriceConflict {
  visiblePrice: string;
  structuredPrice: string;
}

export interface SelectedVariant {
  sku: string | null;
  color: string | null;
  size: string | null;
}

export interface ProductSources {
  title: ProductValueSource;
  price: ProductValueSource | null;
  imageUrl: ProductValueSource | null;
}

export interface ProductSnapshot {
  title: string;
  price: string | null;
  normalizedPrice: NormalizedPrice | null;
  priceConflict: PriceConflict | null;
  imageUrl: string | null;
  url: string;
  variant: SelectedVariant | null;
  sources: ProductSources;
}

export interface GetProductRequest {
  type: "GET_PRODUCT";
}

export interface ProductResponse {
  type: "PRODUCT_RESULT";
  product: ProductSnapshot | null;
}

export interface ProductChangedNotice {
  type: "PRODUCT_CHANGED";
}
