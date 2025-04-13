import { renderers } from './renderers.mjs';
import { s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CvSoi7hX.mjs';
import { manifest } from './manifest_BI9ee7kT.mjs';
import { createExports } from '@astrojs/netlify/ssr-function.js';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/about.astro.mjs');
const _page2 = () => import('./pages/account.astro.mjs');
const _page3 = () => import('./pages/api/cart.astro.mjs');
const _page4 = () => import('./pages/api/checkout.astro.mjs');
const _page5 = () => import('./pages/api/save-quote.astro.mjs');
const _page6 = () => import('./pages/contact.astro.mjs');
const _page7 = () => import('./pages/faq.astro.mjs');
const _page8 = () => import('./pages/igla.astro.mjs');
const _page9 = () => import('./pages/login.astro.mjs');
const _page10 = () => import('./pages/porting.astro.mjs');
const _page11 = () => import('./pages/power-packages.astro.mjs');
const _page12 = () => import('./pages/privacypolicy.astro.mjs');
const _page13 = () => import('./pages/schedule.astro.mjs');
const _page14 = () => import('./pages/services.astro.mjs');
const _page15 = () => import('./pages/shop/_slug_.astro.mjs');
const _page16 = () => import('./pages/shop.astro.mjs');
const _page17 = () => import('./pages/termsandconditions.astro.mjs');
const _page18 = () => import('./pages/warranty.astro.mjs');
const _page19 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/about.astro", _page1],
    ["src/pages/account.astro", _page2],
    ["src/pages/api/cart.ts", _page3],
    ["src/pages/api/checkout.ts", _page4],
    ["src/pages/api/save-quote.ts", _page5],
    ["src/pages/contact.astro", _page6],
    ["src/pages/faq.astro", _page7],
    ["src/pages/igla.astro", _page8],
    ["src/pages/login.astro", _page9],
    ["src/pages/porting.astro", _page10],
    ["src/pages/power-packages.astro", _page11],
    ["src/pages/privacypolicy.astro", _page12],
    ["src/pages/schedule.astro", _page13],
    ["src/pages/services.astro", _page14],
    ["src/pages/shop/[slug].astro", _page15],
    ["src/pages/shop/index.astro", _page16],
    ["src/pages/termsandconditions.astro", _page17],
    ["src/pages/warranty.astro", _page18],
    ["src/pages/index.astro", _page19]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "c51fa7ea-b016-4748-bc32-192edca81941"
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (_start in serverEntrypointModule) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
