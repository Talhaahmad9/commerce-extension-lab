# Commerce Extension Lab

A Chrome Manifest V3 extension for learning how to inspect ecommerce product pages and display their information in a React side panel.

The project combines visible page content, JSON-LD structured data, and a limited Shopify fallback. It tracks where core values came from, identifies conflicting prices, and updates when the active page or selected product changes.

This is a generic learning project with representative fixtures and retailer tests. It is not a universal product scraper or a production shopping assistant.

## Features

- Read the active page’s title and URL.
- Extract a product’s title, display price, image URL, and product URL.
- Read Product and ProductGroup JSON-LD.
- Match supported structured variants using the page’s `skuId`.
- Display SKU, shade/color, and size when available.
- Separate the displayed price from its normalized amount and currency.
- Show whether title, price, and image values came from visible page content or JSON-LD.
- Warn when visible and structured prices disagree.
- Update automatically after DOM changes, supported URL changes, and tab changes.
- Clear previous product details when no product remains.
- Ignore malformed JSON-LD and continue using visible content.
- Read Shopify SKU and option data on verified Jenpharm product pages.
- Display standalone sizes such as `30gm` and `20 Capsules`.
- Render extracted text safely through React.
- Run automated extension integration tests with Playwright.

## Technology

| Technology | Role |
|---|---|
| Chrome Manifest V3 | Extension configuration and execution model |
| TypeScript | Application types and compile-time checks |
| React | Side-panel interface and state |
| Tailwind CSS | Styling |
| Vite | Building the interface and content script |
| chrome-types | Type definitions for Chrome APIs |
| Playwright | Automated browser and extension tests |

Exact dependency requirements are in `package.json`. Resolved dependency versions are recorded in `package-lock.json`.

## Requirements

- Node.js and npm.
- A recent desktop Google Chrome installation for manual testing.
- Playwright’s bundled Chromium for automated extension tests.

The project was developed using Node.js `26.9.0` and npm `11.6.1`.

The manifest declares Chrome `114` as its minimum version because the project uses the Side Panel API. Automated tests run against Playwright’s installed Chromium; they do not establish compatibility with every Chrome version.

## Setup

Clone the repository:

```bash
git clone https://github.com/Talhaahmad9/commerce-extension-lab.git
cd commerce-extension-lab
```

Install the dependencies recorded in the lockfile:

```bash
npm ci
```

Build the extension:

```bash
npm run build
```

The build command runs:

1. TypeScript checking without emitting JavaScript.
2. The Vite build for the React interface.
3. A separate Vite build for the content script.

The resulting unpacked extension is in `dist/`.

## Load the Extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository’s `dist` directory.
5. Open a supported product page.
6. Open **Commerce Extension Lab** using Chrome’s available side-panel controls.

The current build declares a side-panel page but does not implement a custom toolbar action for opening it. Browser UI placement may vary between Chrome versions.

See Chrome’s documentation for [loading an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world) and [side-panel behavior](https://developer.chrome.com/docs/extensions/reference/api/sidePanel).

### Reload After Code Changes

After changing application code or the manifest:

```bash
npm run build
```

Then:

1. Reload the extension in `chrome://extensions`.
2. Refresh the retailer page so Chrome injects the rebuilt content script.
3. Reopen the side panel if necessary.

Editing source files does not automatically update the unpacked extension already loaded in Chrome.

## Using the Extension

The interface contains two main sections.

### Page Information

Shows:

- Document title.
- Current page URL.

The **Read page information** button requests a fresh snapshot from the active page’s content script.

### Product Inspection

Shows available product information:

- Product title.
- SKU.
- Shade/color.
- Size.
- Display price.
- Normalized price.
- Price conflict warning.
- Image URL.
- Product URL.

The **Read product** button requests a fresh inspection.

The interface also refreshes automatically for supported page and tab changes.

A missing field is shown as **Not found** or **Not available**. Missing shade data does not necessarily indicate a failure: a product may have no shade option.

Image URLs are currently displayed as text, rather than rendered as product previews.

## Architecture

The extension has two application execution contexts:

1. A content script running alongside the retailer page.
2. An extension page containing the React side-panel interface.

There is no production service worker or backend.

```text
Retailer page DOM and JSON-LD
             |
             v
        Content script
             |
             +--> Optional same-origin Shopify product request
             |
             v
       Chrome messaging
             |
             v
    React side-panel state
             |
             v
      Displayed information
```

### Content Script

The content script can read the page DOM.

It runs in Chrome’s isolated extension world. Reading the DOM does not mean it directly shares the retailer’s JavaScript variables.

Its responsibilities include:

- Handling inspection requests.
- Reading page information.
- Extracting and enriching product information.
- Watching for relevant page changes.
- Sending change notifications to the extension interface.

### React Interface

The interface runs as an extension page.

It uses Chrome messaging to request information from the active tab’s content script. It does not directly read the retailer DOM.

It validates incoming replies before placing their values into React state.

Request counters help prevent older asynchronous replies from replacing newer results.

### Service Worker

The application does not currently need a production service worker.

The automated test setup adds a small worker to a temporary copy of the built extension so Playwright can discover its extension ID. That worker is not added to the production manifest.

## Project Structure

```text
commerce-extension-lab/
├── fixtures/
│   └── product.html
├── public/
│   └── manifest.json
├── src/
│   ├── content.ts
│   ├── extractJsonLdProduct.ts
│   ├── extractProduct.ts
│   ├── main.tsx
│   ├── messages.ts
│   ├── observePageChanges.ts
│   ├── readJsonLd.ts
│   ├── readProduct.ts
│   └── style.css
├── tests/
│   ├── extension.fixture.js
│   ├── product.spec.js
│   └── shopify.spec.js
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── playwright.config.js
├── README.md
├── tsconfig.json
├── vite.config.ts
└── vite.content.config.ts
```

### File Responsibilities

| File | Responsibility |
|---|---|
| `public/manifest.json` | Declares the side panel, permission, and content-script URL matches |
| `index.html` | Provides the root element and entry point for the interface |
| `src/main.tsx` | React interface, reply validation, state, and active-tab event handling |
| `src/messages.ts` | Shared message and product data types |
| `src/content.ts` | Chrome message listener and page-change notifications |
| `src/readJsonLd.ts` | Parses JSON-LD and finds supported product nodes |
| `src/extractJsonLdProduct.ts` | Reads supported fields from a structured product |
| `src/extractProduct.ts` | Combines visible content and structured data |
| `src/readProduct.ts` | Adds Shopify metadata and standalone-size fallback |
| `src/observePageChanges.ts` | Watches DOM changes and polls for URL changes |
| `src/style.css` | Tailwind entry and interface styling |
| `vite.config.ts` | Builds the React interface and CSS |
| `vite.content.config.ts` | Builds the content script as `dist/content.js` |
| `fixtures/product.html` | Interactive local product fixture |
| `playwright.config.js` | Configures tests and the fixture server |
| `tests/extension.fixture.js` | Loads an isolated extension copy and browser profile |
| `tests/product.spec.js` | Tests the core extraction and display flow |
| `tests/shopify.spec.js` | Tests Shopify enrichment and fallback behavior |

## Product Data Model

The central result is a `ProductSnapshot`.

| Field | Meaning |
|---|---|
| `title` | Extracted product name |
| `price` | Display-price text |
| `normalizedPrice` | Amount, optional currency, and extraction source |
| `priceConflict` | Visible and structured price values when they disagree |
| `imageUrl` | Extracted image URL, if available |
| `url` | Current page URL |
| `variant` | Available SKU, color, and size details |
| `sources` | Sources for title, display price, and image URL |

A missing product is represented by `null`.

Optional fields can be `null` without invalidating the entire product.

The internal `variant` field also currently holds product attributes such as a single product’s package size. The interface labels this section **Product details** because those attributes do not always represent selectable variants.

Field-level provenance is currently recorded for title, display price, image URL, and normalized price. SKU, color, and size do not yet have individual source fields.

## Extraction Behavior

### Visible Page Content

The generic DOM extractor looks primarily inside `main`.

It uses:

- A product `h1` for the visible title.
- Price-like content after the heading.
- Image candidates selected using supported SKU patterns, title-related alternative text, and rendered area.
- Supported size labels and standalone measurements.

These are heuristics. They depend on page structure and are not reliable for every website.

### JSON-LD

JSON-LD is machine-readable JSON embedded in a page, commonly inside:

```html
<script type="application/ld+json">
  ...
</script>
```

The parser:

- Reads matching script elements.
- Ignores malformed JSON.
- Handles top-level arrays and `@graph` containers.
- Recognizes Product and ProductGroup nodes.
- Matches supported ProductGroup variants against `skuId`.
- Reads supported product and Offer fields.

See [Schema.org Product](https://schema.org/Product) and [ProductGroup](https://schema.org/ProductGroup).

### Price Normalization and Conflicts

Display-price text and normalized price are separate.

For example:

```text
Display price: Rs. 1,298
Normalized amount: 1298
Currency: unknown
```

A symbol such as `$` or `Rs.` is not enough for this implementation to establish a unique currency.

When visible and structured prices agree, structured data can supply the normalized currency.

When they disagree:

- The interface shows both values in a warning.
- The normalized price uses the visible value.
- Missing currency evidence remains unknown.

The warning identifies disagreement between sources. It does not independently verify the retailer’s actual checkout price.

### Shopify Fallback

The Shopify fallback is currently enabled only for:

```text
https://jenpharm.com
```

It requests the current product’s same-origin `.js` endpoint.

Example:

```text
/products/mandelac-cream
        |
        v
/products/mandelac-cream.js
```

See Shopify’s [Ajax Product API](https://shopify.dev/docs/api/ajax/reference/product).

The fallback:

- Validates the response structure.
- Uses the URL’s `variant` parameter when present.
- Uses the only variant when the product has exactly one.
- Otherwise matches cart-form IDs against variants belonging to that product.
- Leaves selection unresolved when matching IDs are ambiguous.
- Reads the actual merchant SKU.
- Reads supported Color, Colour, Shade, and Size option names.
- Ignores the placeholder `Default Title`.
- Preserves visible extraction when the request fails.

Shopify variant IDs and merchant SKUs are separate identifiers.

The request has a three-second timeout. Product data is cached for one minute within the content-script instance.

This fallback enriches an already detected product. It does not currently recover a product that the initial DOM/JSON-LD extractor could not detect.

Shopify price and currency enrichment are not implemented.

## Automatic Updates

`observePageChanges.ts` uses:

- A MutationObserver for relevant DOM changes.
- A 300 ms debounce.
- A 1,500 ms maximum wait during continuing mutations.
- URL polling every 500 ms.

The content script starts observation when it receives its first product request.

The React interface also listens for:

- Active-tab changes.
- Tab loading and completion.
- Product-change notifications from content scripts.

URL polling helps detect client-side navigation and variant URL changes that do not reload the document.

Changes that only update JavaScript properties, without a watched DOM mutation or URL change, may not trigger a refresh.

## Configured Sites

Content-script injection is restricted to the URL patterns in the manifest.

| Site | Configured scope |
|---|---|
| Example.com | General page-information and no-product checks |
| TestingURL.dev | Ecommerce product fixtures and one microdata example |
| Sephora | `www.sephora.com/product/*` |
| Jenpharm | `jenpharm.com/products/*` |
| Local fixture server | `http://127.0.0.1/fixtures/*` |

A configured URL pattern means the script can run there. It does not guarantee correct extraction from every page matching that pattern.

### Representative Manual Checks

Manual testing included:

- TestingURL ecommerce and structured-data pages.
- Sephora product shade changes.
- Sephora image selection tied to the selected SKU.
- A simulated disagreement between visible and structured prices.
- Jenpharm MandelAC Cream.
- Jenpharm Meloryn Brightening Cream Capsules.

Observed Jenpharm results included:

| Product | SKU | Size |
|---|---|---|
| MandelAC Cream | `COM-009` | `30gm` |
| Meloryn Brightening Cream Capsules | `COM-039` | `20 Capsules` |

These are recorded test observations, not guarantees about future retailer content.

## Local Fixture Testing

Start the fixture server:

```bash
npx vite --host 127.0.0.1 --port 4173 --strictPort
```

Open:

```text
http://127.0.0.1:4173/fixtures/product.html?skuId=1001
```

Keep the server terminal running during manual testing.

The fixture provides:

| Mode | Purpose |
|---|---|
| Normal | Standard visible and structured product data |
| Shade selection | SKU, size, price, image, and URL updates |
| Price conflict | Visible and structured prices disagree |
| JSON-LD only | Product details are absent from visible markup |
| Malformed JSON-LD | Visible extraction survives invalid JSON |
| No product | Previous product details are cleared |
| HTML-looking title | Extracted text is displayed literally |

The fixture is served by Vite from the repository. It is not included as an extension page in the build.

## Automated Testing

Install Playwright’s Chromium:

```bash
npx playwright install chromium
```

If the download times out, retry in Git Bash with a longer timeout:

```bash
PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=120000 npx playwright install chromium
```

Build before testing so the tests load the current application:

```bash
npm run build
npx playwright test
```

To watch the browser:

```bash
npx playwright test --headed
```

The latest verified run passed all **11 tests**.

### Test Coverage

The core tests cover:

1. Initial product extraction through the extension.
2. Automatic product and page-information updates after a variant change.
3. Price conflict display and visible-price selection.
4. JSON-LD-only extraction.
5. Fallback after malformed JSON-LD.
6. Clearing previous product details.
7. Rendering HTML-looking product text safely.

The Shopify tests cover:

8. Merchant SKU and standalone size without inventing a shade.
9. Visible-data fallback when the product endpoint fails.
10. Ignoring unrelated recommended-product IDs.
11. Refusing to guess a variant when the URL requests an unknown ID.

### How the Tests Run

The test setup:

1. Copies `dist` into a temporary directory.
2. Adds a test-only service worker to discover the extension ID.
3. Launches Playwright’s bundled Chromium with a fresh persistent profile.
4. Opens the extension interface in an extension tab.
5. Opens the retailer fixture as the active tab.
6. Checks results displayed by the React interface.
7. Closes the browser and removes temporary files.

The Shopify tests intercept network requests and supply controlled HTML and JSON responses. They do not require live Jenpharm availability.

The tests exercise content-script extraction, Chrome messaging, and React rendering. They do not automate Chrome’s native side-panel shell or establish universal retailer compatibility.

See [Playwright extension testing](https://playwright.dev/docs/chrome-extensions).

## Permissions and Security

The production manifest declares:

```json
{
  "permissions": ["sidePanel"]
}
```

Content-script access is scoped using explicit URL matches.

The application does not currently request broad access to every website, persistent storage, or a backend.

Existing safeguards include:

- Treating page content and message replies as untrusted input.
- Checking message and product shapes before updating React state.
- Rendering product text through React without `dangerouslySetInnerHTML`.
- Keeping Shopify requests on an explicitly allowed origin.
- Rejecting redirects for Shopify requests.
- Limiting request duration.
- Preserving unknown or missing values instead of inventing them.
- Preventing older interface requests from replacing newer results.

The extension reads page content and makes an optional same-origin product request. It does not modify carts, place orders, or transmit product snapshots to an external AI service.

These safeguards and tests are not a comprehensive security audit.

## AI Integration

There is no AI or LLM integration in the current application.

If one is added later:

- Send only the fields needed for the feature.
- Treat retailer text as data, including any instruction-like text it contains.
- Keep provider API secrets on a backend.
- Validate model output against an expected structure.
- Keep extracted facts separate from generated suggestions.
- Preserve source information.
- Require explicit user approval for consequential actions.

## Debugging

### Content Script

Open DevTools on the retailer page.

Look for:

```text
[Commerce Extension Lab is running. Page Title: ]
```

If the message is missing:

- Check that the URL matches the manifest.
- Check extension site access.
- Rebuild and reload the extension.
- Refresh the retailer page.

### Side Panel

Use the side panel’s inspection option when available to open its DevTools.

Inspect:

- Runtime errors.
- Message replies.
- React state updates.
- Active-tab behavior.

### Extension Errors

Open `chrome://extensions` and inspect errors reported for the extension.

### Could Not Reach This Page

Check whether:

- The page is supported.
- The content script has been injected.
- The page was refreshed after an extension reload.
- Chrome has allowed the extension access to the site.

Browser-internal pages such as `chrome://` pages are outside the configured scope.

### Old Results After a Change

Confirm that:

1. The extension was rebuilt.
2. Chrome reloaded the extension.
3. The retailer page was refreshed.
4. The changed data caused a watched DOM mutation or URL change.

### Tests Use Old Code

Tests load `dist`, not the latest TypeScript source directly.

Run:

```bash
npm run build
npx playwright test
```

### Fixture Server Port Is Busy

The server uses port `4173` with `--strictPort`.

Playwright can reuse the existing local fixture server. If an unrelated application occupies the port, stop it or consistently change the server and fixture URLs in the configuration and tests.

## Current Limitations

- Only configured URL patterns receive the content script.
- DOM extraction assumes a supported `main` and heading structure.
- Generic selectors can still select incorrect content on unfamiliar layouts.
- Price parsing supports a limited set of formats and currencies.
- There is no checkout-price verification.
- JSON-LD Offer arrays and AggregateOffer pricing are not handled.
- Structured image objects and complex structured size values are not handled.
- ProductGroup selection depends on the currently supported SKU matching.
- Shopify fallback is enabled only for Jenpharm.
- Shopify option mapping recognizes a limited set of option names.
- Standalone size detection supports a limited set of units and counts.
- Product details lack individual source labels for SKU, color, and size.
- Image extraction relies partly on retailer-specific SKU URL patterns.
- Data inside unsupported iframes, shadow roots, or page JavaScript state may be missed.
- Shopify requests can fail because of network or site restrictions.
- There is no persistent history, backend, recommendation system, or AI feature.
- Automated tests cover representative fixtures, not every supported retailer page.

## Extending Coverage

For an unfamiliar retailer:

1. Reproduce the missing or incorrect field.
2. Inspect its visible DOM and structured data.
3. Check whether a shared platform convention explains the problem.
4. Confirm how the currently selected product or variant is identified.
5. Preserve missing values when the evidence is ambiguous.
6. Add a representative fixture or mocked response.
7. Add a regression test for the observed failure.
8. Implement the smallest justified change.
9. Retest existing behavior and the real page.

Shared structured-data and platform support should be expanded before adding many retailer-specific selectors.

For additional Shopify stores, verify their product endpoint and selection behavior before adding their origin to the fallback’s allowlist. Content-script URL matches must also permit the intended pages.

## Learning Scope

The project covers:

- Manifest V3 configuration.
- Extension execution contexts.
- Content-script DOM access.
- Typed Chrome messaging.
- React state and asynchronous reply handling.
- JSON-LD Product and ProductGroup extraction.
- Product normalization and provenance.
- Missing and conflicting information.
- SKU, shade, size, and variant identification.
- DOM observation and debouncing.
- Client-side URL changes.
- Local fixtures.
- Playwright extension testing.
- Extension security and trust boundaries.
- Safe AI integration principles.
- Real-retailer failure investigation.

AI integration was covered conceptually. Universal scraping and production deployment are outside the current project scope.

## Command Reference

| Command | Purpose |
|---|---|
| `npm ci` | Install dependencies from the lockfile |
| `npm run build` | Check types and build the extension |
| `npx vite --host 127.0.0.1 --port 4173 --strictPort` | Serve local fixtures |
| `npx playwright install chromium` | Install the test browser |
| `npx playwright test` | Run automated tests |
| `npx playwright test --headed` | Run tests with the browser visible |
| `git diff --check` | Check the current diff for whitespace errors |

## Official References

- [Chrome extension documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Chrome message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome extension security](https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure)
- [Schema.org Product](https://schema.org/Product)
- [Schema.org ProductGroup](https://schema.org/ProductGroup)
- [Shopify Ajax Product API](https://shopify.dev/docs/api/ajax/reference/product)
- [React documentation](https://react.dev/)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- [Vite documentation](https://vite.dev/guide/)
- [Tailwind CSS documentation](https://tailwindcss.com/docs/)
- [Playwright extension testing](https://playwright.dev/docs/chrome-extensions)