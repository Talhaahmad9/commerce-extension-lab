import { useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  GetProductRequest,
  PageInfoRequest,
  PageInfoResponse,
  ProductSnapshot,
} from "./messages";
import "./style.css";

function App() {
  const [pageInfo, setPageInfo] = useState<PageInfoResponse | null>(null);
  const [status, setStatus] = useState("Ready to read page information.");

  const [product, setProduct] = useState<ProductSnapshot | null>(null);
  const [productStatus, setProductStatus] = useState(
    "Ready to inspect product.",
  );

  async function readPageInfo() {
    setPageInfo(null);
    setStatus("Waiting for the page...");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab?.id === undefined) {
        setStatus("No active tab found.");
        return;
      }

      const request: PageInfoRequest = { type: "GET_PAGE_INFO" };
      const response: unknown = await chrome.tabs.sendMessage(tab.id, request);

      if (
        typeof response !== "object" ||
        response === null ||
        !("type" in response) ||
        response.type !== "PAGE_INFO" ||
        !("title" in response) ||
        typeof response.title !== "string" ||
        !("url" in response) ||
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
      setStatus("Could not reach this page. Check site access and refresh it.");
    }
  }

  async function readProduct() {
    setProduct(null);
    setProductStatus("Inspecting the page...");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab?.id === undefined) {
        setProductStatus("No active tab found.");
        return;
      }

      const request: GetProductRequest = { type: "GET_PRODUCT" };
      const response: unknown = await chrome.tabs.sendMessage(tab.id, request);

      if (
        typeof response !== "object" ||
        response === null ||
        !("type" in response) ||
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

      if (
        typeof candidate !== "object" ||
        !("title" in candidate) ||
        typeof candidate.title !== "string" ||
        !("price" in candidate) ||
        (candidate.price !== null && typeof candidate.price !== "string") ||
        !("imageUrl" in candidate) ||
        (candidate.imageUrl !== null &&
          typeof candidate.imageUrl !== "string") ||
        !("url" in candidate) ||
        typeof candidate.url !== "string"
      ) {
        setProductStatus("The product details had an unexpected shape.");
        return;
      }

      const snapshot: ProductSnapshot = {
        title: candidate.title,
        price: candidate.price,
        imageUrl: candidate.imageUrl,
        url: candidate.url,
      };

      setProduct(snapshot);
      setProductStatus("Product found.");
    } catch {
      setProductStatus(
        "Could not reach this page. Check site access and refresh it.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900">
      <h1 className="text-xl font-semibold">Commerce Extension Lab</h1>

      <button
        type="button"
        onClick={readPageInfo}
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
          onClick={readProduct}
          className="mt-3 rounded bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Read product
        </button>

        <p className="mt-4 text-sm text-slate-600">{productStatus}</p>

        {product !== null && (
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Title: <strong>{product.title}</strong>
            </p>
            <p>
              Price: <strong>{product.price ?? "Not found"}</strong>
            </p>
            <p className="break-all">
              Image URL: <strong>{product.imageUrl ?? "Not found"}</strong>
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
