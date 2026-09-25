import { extractProduct } from "./extractProduct";
import type {
  PageInfoResponse,
  PingResponse,
  ProductResponse,
} from "./messages";

console.log(
  "[Commerce Extension Lab is running. Page Title: ]",
  document.title,
);

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    if (
      typeof message !== "object" ||
      message === null ||
      !("type" in message)
    ) {
      return false;
    }

    if (message.type === "PING") {
      const response: PingResponse = {
        type: "PONG",
        message: document.title,
      };

      sendResponse(response);
      return false;
    }

    if (message.type === "GET_PAGE_INFO") {
      const response: PageInfoResponse = {
        type: "PAGE_INFO",
        title: document.title,
        url: window.location.href,
      };

      sendResponse(response);
      return false;
    }

    if (message.type === "GET_PRODUCT") {
      const response: ProductResponse = {
        type: "PRODUCT_RESULT",
        product: extractProduct(document),
      };

      sendResponse(response);
      return false;
    }

    return false;
  },
);
