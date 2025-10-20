# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Google Merchant Center Feed

This project now includes a helper script that exports current products from Sanity, writes a tab-separated file, and uploads them to Google Merchant Center. It prefers the Google Content API when configured, and falls back to SFTP if API credentials are absent.

1. Configure credentials (see `.env.example` for full list):
   - **Content API (recommended):** set `GMC_CONTENT_API_MERCHANT_ID` and supply a service account credential via `GMC_SERVICE_ACCOUNT_KEY` (JSON string), `GMC_SERVICE_ACCOUNT_KEY_BASE64`, or `GMC_SERVICE_ACCOUNT_KEY_FILE`. Store the JSON in your secret manager and inject it at runtime; avoid committing the file.
   - **SFTP fallback:** keep `GMC_SFTP_HOST`, `GMC_SFTP_PORT`, `GMC_SFTP_USERNAME`, `GMC_SFTP_PASSWORD`, and `GMC_SFTP_FEED_FILENAME` if you still need file-based uploads.
   - Optional defaults: `GMC_FEED_BASE_URL`, `GMC_FEED_CURRENCY`, `GMC_FEED_LANGUAGE`, `GMC_FEED_TARGET_COUNTRY`, `GMC_FEED_DEFAULT_WEIGHT_LB`, `GMC_FEED_DEFAULT_QUANTITY`, and `GMC_FEED_SHIPPING_PRICE`.
   - Opt-in behaviour: set `GMC_FEED_ENABLE_ADS_REDIRECT=true` only if you explicitly want Merchant Center to use the `/checkout/quick/<slug>` landing pages for ads. It defaults to `false` so product ads lead to the full product detail page on all devices.
2. Install dependencies if you haven’t already: `yarn install`.
3. Generate and upload the feed: `yarn merchant:upload`.

The feed file is always written to `tmp/<filename>` locally so you can inspect or manually upload it if needed. When Content API credentials are present the script pushes products directly; otherwise it attempts the SFTP upload.

## Stripe Product Sync

Need your Sanity products to appear in Stripe? Run the sync script to create/update Stripe Products & Prices and push the IDs back into Sanity.

```bash
yarn stripe:sync        # Sync all products
yarn stripe:sync --slug=hellcat-snout  # Sync a single product by slug
yarn stripe:sync --dry-run            # Preview without making changes
```

The script requires `STRIPE_SECRET_KEY`, `SANITY_PROJECT_ID`, `SANITY_DATASET`, and a Sanity write token (`SANITY_WRITE_TOKEN`). Successful sync writes `stripeProductId`, `stripePriceId`, and `stripeLastSyncedAt` into each product document.
