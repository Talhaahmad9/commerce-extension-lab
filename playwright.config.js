import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  workers: 1,
  fullyParallel: false,
  reporter: "list",

  webServer: {
    command: "npx vite --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/fixtures/product.html",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
