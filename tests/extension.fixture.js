import { test as base, chromium } from "@playwright/test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const test = base.extend({
  context: async ({ headless }, use) => {
    const temporaryRoot = await mkdtemp(
      path.join(tmpdir(), "commerce-extension-test-"),
    );

    const extensionPath = path.join(temporaryRoot, "extension");
    const profilePath = path.join(temporaryRoot, "profile");
    let context;

    try {
      await cp(path.resolve("dist"), extensionPath, {
        recursive: true,
      });

      const manifestPath = path.join(extensionPath, "manifest.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

      if (manifest.background) {
        throw new Error(
          "The test setup needs updating because the extension now has a background script.",
        );
      }

      manifest.background = {
        service_worker: "test-worker.js",
      };

      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      await writeFile(
        path.join(extensionPath, "test-worker.js"),
        "chrome.runtime.onInstalled.addListener(() => {});\n",
      );

      context = await chromium.launchPersistentContext(profilePath, {
        channel: "chromium",
        headless,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
      });

      await use(context);
    } finally {
      try {
        if (context) {
          await context.close();
        }
      } finally {
        await rm(temporaryRoot, {
          recursive: true,
          force: true,
          maxRetries: 10,
          retryDelay: 200,
        });
      }
    }
  },

  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();

    if (!worker) {
      worker = await context.waitForEvent("serviceworker");
    }

    const extensionId = new URL(worker.url()).hostname;
    await use(extensionId);
  },

  panel: async ({ context, extensionId }, use) => {
    const panel = await context.newPage();

    await panel.goto(`chrome-extension://${extensionId}/index.html`);

    await panel
      .getByRole("button", {
        name: "Read product",
        exact: true,
      })
      .waitFor();

    await use(panel);
  },

  retailer: async ({ context, panel }, use) => {
    const retailer = await context.newPage();

    await retailer.goto(
      "http://127.0.0.1:4173/fixtures/product.html?skuId=1001",
    );

    await retailer.bringToFront();

    await panel.getByText("Product found.", { exact: true }).waitFor();

    await use(retailer);
  },
});

export { expect } from "@playwright/test";
