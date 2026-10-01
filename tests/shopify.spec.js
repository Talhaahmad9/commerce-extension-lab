import { test, expect } from "./extension.fixture.js";

const PRODUCT_URL = "https://jenpharm.com/products/test-capsules";

const HTML = `
<!doctype html>
<html>
  <head><title>Test Capsules</title></head>
  <body>
    <main>
      <h1>Test Capsules</h1>
      <p>20 Capsules</p>
      <p>Rs. 1,298</p>

      <form action="/cart/add">
        <input name="id" value="101" type="hidden">
      </form>

      <h2>Recommended products</h2>

      <form action="/cart/add">
        <input name="id" value="999" type="hidden">
      </form>
    </main>
  </body>
</html>
`;

const SINGLE_PRODUCT = {
  title: "Test Capsules",
  options: [
    {
      name: "Title",
      position: 1,
      values: ["Default Title"],
    },
  ],
  variants: [
    {
      id: 101,
      sku: "COM-039",
      title: "Default Title",
      options: ["Default Title"],
    },
  ],
};

async function mockStore(context, product) {
  await context.route("https://jenpharm.com/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/products/test-capsules.js") {
      if (product === null) {
        await route.fulfill({
          status: 503,
          body: "Temporarily unavailable",
        });
      } else {
        await route.fulfill({
          json: product,
        });
      }

      return;
    }

    if (url.pathname === "/products/test-capsules") {
      await route.fulfill({
        contentType: "text/html",
        body: HTML,
      });

      return;
    }

    await route.abort();
  });
}

test("reads the actual SKU and standalone size without inventing a shade", async ({
  context,
  retailer,
  panel,
}) => {
  await mockStore(context, SINGLE_PRODUCT);
  await retailer.goto(PRODUCT_URL);

  await expect(panel.getByText("SKU: COM-039", { exact: true })).toBeVisible();

  await expect(
    panel.getByText("Size: 20 Capsules", { exact: true }),
  ).toBeVisible();

  await expect(
    panel.getByText("Shade/color: Not found", { exact: true }),
  ).toBeVisible();
});

test("keeps visible data when the product endpoint fails", async ({
  context,
  retailer,
  panel,
}) => {
  await mockStore(context, null);
  await retailer.goto(PRODUCT_URL);

  await expect(panel.getByText(/^Display price:/)).toHaveText(
    "Display price: Rs. 1,298 (visible page)",
  );

  await expect(
    panel.getByText("Size: 20 Capsules", { exact: true }),
  ).toBeVisible();

  await expect(
    panel.getByText("SKU: Not found", { exact: true }),
  ).toBeVisible();
});

test("ignores recommended-product IDs when selecting a variant", async ({
  context,
  retailer,
  panel,
}) => {
  await mockStore(context, {
    ...SINGLE_PRODUCT,
    variants: [
      ...SINGLE_PRODUCT.variants,
      {
        id: 102,
        sku: "COM-040",
        options: ["Large"],
      },
    ],
  });

  await retailer.goto(PRODUCT_URL);

  await expect(panel.getByText("SKU: COM-039", { exact: true })).toBeVisible();
});

test("does not guess a variant when the URL requests an unknown ID", async ({
  context,
  retailer,
  panel,
}) => {
  await mockStore(context, SINGLE_PRODUCT);
  await retailer.goto(`${PRODUCT_URL}?variant=777`);

  await expect(
    panel.getByText("Size: 20 Capsules", { exact: true }),
  ).toBeVisible();

  await expect(
    panel.getByText("SKU: Not found", { exact: true }),
  ).toBeVisible();
});
