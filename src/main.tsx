import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  GetProductRequest,
  PageInfoRequest,
  PageInfoResponse,
  ProductSnapshot,
  ProductValueSource,
} from "./messages";
import "./style.css";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSource(value: unknown): value is ProductValueSource {
  return value === "visible-dom" || value === "json-ld";
}

function isNullableSource(value: unknown): value is ProductValueSource | null {
  return value === null || isSource(value);
}

function isProductSnapshot(value: unknown): value is ProductSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.title !== "string" ||
    (value.price !== null && typeof value.price !== "string") ||
    (value.imageUrl !== null && typeof value.imageUrl !== "string") ||
    typeof value.url !== "string"
  ) {
    return false;
  }

  const sources = value.sources;

  if (
    !isRecord(sources) ||
    !isSource(sources.title) ||
    !isNullableSource(sources.price) ||
    !isNullableSource(sources.imageUrl)
  ) {
    return false;
  }

  const conflict = value.priceConflict;

  if (
    conflict !== null &&
    (!isRecord(conflict) ||
      typeof conflict.visiblePrice !== "string" ||
      typeof conflict.structuredPrice !== "string")
  ) {
    return false;
  }

  const variant = value.variant;

  if (
    variant !== null &&
    (!isRecord(variant) ||
      (variant.sku !== null && typeof variant.sku !== "string") ||
      (variant.color !== null && typeof variant.color !== "string") ||
      (variant.size !== null && typeof variant.size !== "string"))
  ) {
    return false;
  }

  const normalizedPrice = value.normalizedPrice;

  return (
    normalizedPrice === null ||
    (isRecord(normalizedPrice) &&
      typeof normalizedPrice.amount === "string" &&
      (normalizedPrice.currency === null ||
        typeof normalizedPrice.currency === "string") &&
      isSource(normalizedPrice.source))
  );
}

function sourceLabel(source: ProductValueSource | null): string {
  if (source === "visible-dom") {
    return "visible page";
  }

  if (source === "json-ld") {
    return "JSON-LD";
  }

  return "not found";
}

function App() {
  const [pageInfo, setPageInfo] = useState<PageInfoResponse | null>(null);
  const [status, setStatus] = useState("Ready to read page information.");

  const [product, setProduct] = useState<ProductSnapshot | null>(null);
  const [productStatus, setProductStatus] = useState(
    "Ready to inspect product.",
  );

  const pageRequestId = useRef(0);
  const productRequestId = useRef(0);

  const clearSnapshot = useCallback(() => {
    pageRequestId.current += 1;
    productRequestId.current += 1;

    setPageInfo(null);
    setProduct(null);
    setStatus("Waiting for the active page...");
    setProductStatus("Waiting for a product page...");
  }, []);

  const readPageInfo = useCallback(async (expectedTabId?: number) => {
    const requestId = ++pageRequestId.current;

    if (expectedTabId === undefined) {
      setPageInfo(null);
      setStatus("Waiting for the page...");
    }

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (requestId !== pageRequestId.current) {
        return;
      }

      if (tab?.id === undefined) {
        setPageInfo(null);
        setStatus("No active tab found.");
        return;
      }

      if (expectedTabId !== undefined && tab.id !== expectedTabId) {
        return;
      }

      const request: PageInfoRequest = { type: "GET_PAGE_INFO" };
      const response: unknown = await chrome.tabs.sendMessage(tab.id, request);

      if (requestId !== pageRequestId.current) {
        return;
      }

      if (
        !isRecord(response) ||
        response.type !== "PAGE_INFO" ||
        typeof response.title !== "string" ||
        typeof response.url !== "string"
      ) {
        setStatus("The page sent an unexpected reply.");
        return;
      }

      const info: PageInfoResponse = {
        type: "PAGE_INFO",
        title: response.title,
        url: response.url,
      };

      setPageInfo(info);
      setStatus("Page information received.");
    } catch {
      if (requestId === pageRequestId.current) {
        setStatus(
          "Could not reach this page. Check site access and refresh it.",
        );
      }
    }
  }, []);

  const readProduct = useCallback(async (expectedTabId?: number) => {
    const requestId = ++productRequestId.current;

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (requestId !== productRequestId.current) {
        return;
      }

      if (tab?.id === undefined) {
        setProduct(null);
        setProductStatus("No active tab found.");
        return;
      }

      if (expectedTabId !== undefined && tab.id !== expectedTabId) {
        return;
      }

      setProduct(null);
      setProductStatus("Inspecting the page...");

      const request: GetProductRequest = { type: "GET_PRODUCT" };
      const response: unknown = await chrome.tabs.sendMessage(tab.id, request);

      if (requestId !== productRequestId.current) {
        return;
      }

      if (
        !isRecord(response) ||
        response.type !== "PRODUCT_RESULT" ||
        !("product" in response)
      ) {
        setProductStatus("The page sent an unexpected reply.");
        return;
      }

      const candidate: unknown = response.product;

      if (candidate === null) {
        setProductStatus("No product found on this page.");
        return;
      }

      if (!isProductSnapshot(candidate)) {
        setProductStatus("The product details had an unexpected shape.");
        return;
      }

      setProduct(candidate);
      setProductStatus("Product found.");
    } catch {
      if (requestId === productRequestId.current) {
        setProductStatus(
          "Could not reach this page. Check site access and refresh it.",
        );
      }
    }
  }, []);

  const refreshTab = useCallback(
    (tabId: number) => {
      clearSnapshot();
      void readPageInfo(tabId);
      void readProduct(tabId);
    },
    [clearSnapshot, readPageInfo, readProduct],
  );

  useEffect(() => {
    function forActiveTab(tabId: number, action: () => void) {
      void chrome.tabs
        .query({ active: true, currentWindow: true })
        .then(([tab]) => {
          if (tab?.id === tabId) {
            action();
          }
        })
        .catch(() => {});
    }

    function handleProductChanged(
      message: unknown,
      sender: chrome.runtime.MessageSender,
    ): boolean {
      if (
        !isRecord(message) ||
        message.type !== "PRODUCT_CHANGED" ||
        sender.id !== chrome.runtime.id ||
        sender.tab?.id === undefined
      ) {
        return false;
      }

      forActiveTab(sender.tab.id, () => {
        void readPageInfo(sender.tab!.id);
        void readProduct(sender.tab!.id);
      });

      return false;
    }

    function handleTabActivated(activeInfo: {
      tabId: number;
      windowId: number;
    }) {
      forActiveTab(activeInfo.tabId, () => {
        refreshTab(activeInfo.tabId);
      });
    }

    function handleTabUpdated(
      tabId: number,
      changeInfo: { status?: chrome.tabs.TabStatus },
    ) {
      if (changeInfo.status !== "loading" && changeInfo.status !== "complete") {
        return;
      }

      forActiveTab(tabId, () => {
        if (changeInfo.status === "loading") {
          clearSnapshot();
        } else {
          refreshTab(tabId);
        }
      });
    }

    chrome.runtime.onMessage.addListener(handleProductChanged);
    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (tab?.id === undefined) {
          clearSnapshot();
        } else {
          refreshTab(tab.id);
        }
      })
      .catch(clearSnapshot);

    return () => {
      chrome.runtime.onMessage.removeListener(handleProductChanged);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [clearSnapshot, readPageInfo, readProduct, refreshTab]);

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900">
      <h1 className="text-xl font-semibold">Commerce Extension Lab</h1>

      <button
        type="button"
        onClick={() => void readPageInfo()}
        className="mt-5 rounded bg-slate-900 px-4 py-2 text-sm text-white"
      >
        Read page information
      </button>

      <p className="mt-4 text-sm text-slate-600">{status}</p>

      {pageInfo !== null && (
        <section className="mt-3 space-y-2 text-sm">
          <p>
            Page title: <strong>{pageInfo.title}</strong>
          </p>
          <p className="break-all">
            Page URL: <strong>{pageInfo.url}</strong>
          </p>
        </section>
      )}

      <section className="mt-6 border-t border-slate-200 pt-5">
        <h2 className="font-semibold">Product inspection</h2>

        <button
          type="button"
          onClick={() => void readProduct()}
          className="mt-3 rounded bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Read product
        </button>

        <p className="mt-4 text-sm text-slate-600">{productStatus}</p>

        {product !== null && (
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Title: <strong>{product.title}</strong>
              <span className="text-slate-600">
                {" "}
                ({sourceLabel(product.sources.title)})
              </span>
            </p>

            {product.variant !== null && (
              <div className="rounded border border-slate-200 p-3">
                <p className="font-medium">Selected variant</p>
                <p>SKU: {product.variant.sku ?? "Not found"}</p>
                <p>Shade/color: {product.variant.color ?? "Not found"}</p>
                <p>Size: {product.variant.size ?? "Not found"}</p>
              </div>
            )}

            <p>
              Display price: <strong>{product.price ?? "Not found"}</strong>
              <span className="text-slate-600">
                {" "}
                ({sourceLabel(product.sources.price)})
              </span>
            </p>

            <p>
              Normalized price:{" "}
              <strong>
                {product.normalizedPrice === null
                  ? "Not available"
                  : `${product.normalizedPrice.amount} ${
                      product.normalizedPrice.currency ?? "(currency unknown)"
                    }`}
              </strong>
              {product.normalizedPrice !== null && (
                <span className="text-slate-600">
                  {" "}
                  ({sourceLabel(product.normalizedPrice.source)})
                </span>
              )}
            </p>

            {product.priceConflict !== null && (
              <p className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-950">
                Price check: the page shows{" "}
                <strong>{product.priceConflict.visiblePrice}</strong>, while its
                structured data says{" "}
                <strong>{product.priceConflict.structuredPrice}</strong>. Verify
                the price before relying on it.
              </p>
            )}

            <p className="break-all">
              Image URL: <strong>{product.imageUrl ?? "Not found"}</strong>
              <span className="text-slate-600">
                {" "}
                ({sourceLabel(product.sources.imageUrl)})
              </span>
            </p>

            <p className="break-all">
              Product URL: <strong>{product.url}</strong>
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

const container = document.getElementById("root");

if (!container) {
  throw new Error('Could not find the "root" element in index.html');
}

createRoot(container).render(<App />);
