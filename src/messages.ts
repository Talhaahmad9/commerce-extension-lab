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

export interface ProductSnapshot {
  title: string;
  price: string | null;
  imageUrl: string | null;
  url: string;
}

export interface GetProductRequest {
  type: "GET_PRODUCT";
}

export interface ProductResponse {
  type: "PRODUCT_RESULT";
  product: ProductSnapshot | null;
}
