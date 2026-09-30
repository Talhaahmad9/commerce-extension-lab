import { extractProduct } from "./extractProduct";
import { observePageChanges } from "./observePageChanges";
import type {
  PageInfoResponse,
  PingResponse,
  ProductChangedNotice,
  ProductResponse,
} from "./messages";

console.log(
  "[Commerce Extension Lab is running. Page Title: ]",
  document.title,
);

let isObserving = false;

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
      if (!isObserving) {
        isObserving = true;

        observePageChanges(document, () => {
          const notice: ProductChangedNotice = {
            type: "PRODUCT_CHANGED",
          };

          void chrome.runtime.sendMessage(notice).catch(() => {
            // The panel may be closed, leaving no receiver.
          });
        });
      }

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
