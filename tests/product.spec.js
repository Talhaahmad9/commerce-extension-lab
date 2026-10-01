import { test, expect } from "./extension.fixture.js";

function normalizedPrice(panel) {
  return panel.getByText(/^Normalized price:/);
}

function displayPrice(panel) {
  return panel.getByText(/^Display price:/);
}

function productTitle(panel) {
  return panel.getByText(/^Title:/);
}

function imageUrl(panel) {
  return panel.getByText(/^Image URL:/).locator("strong");
}

test("reads the initial product through the extension", async ({
  retailer,
  panel,
}) => {
  await expect(productTitle(panel)).toHaveText(
    "Title: Fixture Lip Balm (visible page)",
  );

  await expect(panel.getByText("SKU: 1001", { exact: true })).toBeVisible();

  await expect(
    panel.getByText("Shade/color: Rose", { exact: true }),
  ).toBeVisible();

  await expect(
    panel.getByText("Size: 0.5 oz / 15 g", { exact: true }),
  ).toBeVisible();

  await expect(displayPrice(panel)).toHaveText(
    "Display price: $24.00 (visible page)",
  );

  await expect(normalizedPrice(panel)).toHaveText(
    "Normalized price: 24.00 USD (JSON-LD)",
  );

  await expect(imageUrl(panel)).toHaveText(/^data:image\/svg\+xml,/);

  await expect(retailer).toHaveURL(/skuId=1001/);
});

test("updates product and page information when the variant changes", async ({
  retailer,
  panel,
}) => {
  const previousImage = await imageUrl(panel).textContent();

  await retailer.getByLabel("Selected shade:").selectOption("1002");

  await expect(retailer).toHaveURL(/skuId=1002/);

  await expect(panel.getByText("SKU: 1002", { exact: true })).toBeVisible();

  await expect(
    panel.getByText("Shade/color: Plum", { exact: true }),
  ).toBeVisible();

  await expect(
    panel.getByText("Size: 1 oz / 30 g", { exact: true }),
  ).toBeVisible();

  await expect(normalizedPrice(panel)).toHaveText(
    "Normalized price: 28.00 USD (JSON-LD)",
  );

  await expect(panel.getByText(/^Page title:/)).toHaveText(
    "Page title: Fixture Lip Balm - Plum",
  );

  await expect(panel.getByText(/^Page URL:/)).toContainText("skuId=1002");

  await expect(panel.getByText(/^Product URL:/)).toContainText("skuId=1002");

  await expect(imageUrl(panel)).not.toHaveText(previousImage);
});

test("shows a price conflict and uses the visible price", async ({
  retailer,
  panel,
}) => {
  await retailer
    .getByRole("button", {
      name: "Price conflict",
      exact: true,
    })
    .click();

  await expect(displayPrice(panel)).toHaveText(
    "Display price: 56 USD (visible page)",
  );

  await expect(normalizedPrice(panel)).toHaveText(
    "Normalized price: 56 USD (visible page)",
  );

  const warning = panel.getByText(/^Price check:/);

  await expect(warning).toContainText("56 USD");
  await expect(warning).toContainText("24.00 USD");
});

test("reads a product with JSON-LD only", async ({ retailer, panel }) => {
  await retailer
    .getByRole("button", {
      name: "JSON-LD only",
      exact: true,
    })
    .click();

  await expect(productTitle(panel)).toHaveText(
    "Title: Fixture Lip Balm - Rose (JSON-LD)",
  );

  await expect(displayPrice(panel)).toHaveText(
    "Display price: 24.00 USD (JSON-LD)",
  );

  await expect(normalizedPrice(panel)).toHaveText(
    "Normalized price: 24.00 USD (JSON-LD)",
  );

  await expect(
    panel.getByText("Shade/color: Rose", { exact: true }),
  ).toBeVisible();
});

test("falls back to visible data when JSON-LD is malformed", async ({
  retailer,
  panel,
}) => {
  await retailer
    .getByRole("button", {
      name: "Malformed JSON-LD",
      exact: true,
    })
    .click();

  await expect(productTitle(panel)).toHaveText(
    "Title: Fixture Lip Balm (visible page)",
  );

  await expect(normalizedPrice(panel)).toHaveText(
    "Normalized price: 24.00 (currency unknown) (visible page)",
  );

  await expect(
    panel.getByText("Shade/color: Not found", { exact: true }),
  ).toBeVisible();

  await expect(
    panel.getByText("Size: 0.5 oz / 15 g", { exact: true }),
  ).toBeVisible();

  await expect(panel.getByText(/^Price check:/)).toHaveCount(0);
});

test("clears the previous product when no product remains", async ({
  retailer,
  panel,
}) => {
  await expect(productTitle(panel)).toBeVisible();

  await retailer
    .getByRole("button", {
      name: "No product",
      exact: true,
    })
    .click();

  await expect(
    panel.getByText("No product found on this page.", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(productTitle(panel)).toHaveCount(0);
  await expect(normalizedPrice(panel)).toHaveCount(0);
  await expect(
    panel.getByText("Product details", {
      exact: true,
    }),
  ).toHaveCount(0);
});

test("renders an HTML-looking title as plain text", async ({
  retailer,
  panel,
}) => {
  const dialogs = [];

  for (const page of [retailer, panel]) {
    page.on("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
  }

  await retailer
    .getByRole("button", {
      name: "HTML-looking title",
      exact: true,
    })
    .click();

  await expect(productTitle(panel)).toHaveText(
    'Title: <img src=x onerror="alert(1)"> Fixture Lip Balm (visible page)',
  );

  await expect(panel.locator("img")).toHaveCount(0);
  expect(dialogs).toEqual([]);
});
