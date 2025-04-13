import { e as createComponent, m as maybeRenderHead, j as renderScript, r as renderTemplate, i as renderComponent, l as renderSlot, n as renderHead, h as addAttribute } from './astro/server_CMKpZIe-.mjs';
import 'kleur/colors';
import 'html-escaper';
/* empty css                         */
import 'clsx';
import { jsxs, Fragment, jsx } from 'react/jsx-runtime';
import { useState } from 'react';

const $$Header = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div class="fixed top-0 w-full bg-primary text-white text-base font-captain z-50" data-astro-cid-3ef6ksr2> <div class="max-w-screen-xl mx-auto px-6 py-2 flex justify-start gap-6" data-astro-cid-3ef6ksr2> <a href="/about" class="hover:!text-black hover:underline" data-astro-cid-3ef6ksr2>About</a> <span class="text-white/50" data-astro-cid-3ef6ksr2>|</span> <a href="/contact" class="hover:!text-black hover:underline" data-astro-cid-3ef6ksr2>Contact</a> <span class="text-white/50" data-astro-cid-3ef6ksr2>|</span> <a href="/faq" class="hover:!text-black hover:underline" data-astro-cid-3ef6ksr2>FAQ</a> </div> </div> <header class="bg-transparent text-white w-full pt-[40px]" data-astro-cid-3ef6ksr2> <!-- Sticky header --> <div class="my-sticky-header hidden md:flex items-center justify-between px-6 py-3" data-astro-cid-3ef6ksr2> <img src="/images/faslogochroma.png" alt="FAS Chrome Logo" class="h-12" data-astro-cid-3ef6ksr2> <nav class="flex gap-6 text-sm font-ethno uppercase tracking-wider" data-astro-cid-3ef6ksr2></nav> <div class="flex items-center gap-4" data-astro-cid-3ef6ksr2> <a href="/" class="text-sm hover:text-accent" data-astro-cid-3ef6ksr2>Search</a> </div> </div> <!-- Mobile Header --> <div class="flex md:hidden justify-between items-center bg-black bg-opacity-90 text-white px-4 py-3 mx-[5px] mt-[10px] rounded-[20px] shadow-md" data-astro-cid-3ef6ksr2> <img src="https://fasmotorsports.com/wp-content/uploads/2025/03/FAS-Motorsports-Logo-e1742004093813.png" alt="FAS Logo" class="h-10" data-astro-cid-3ef6ksr2> <button id="mobileMenuToggle" aria-label="Open Menu" class="text-white focus:outline-none" data-astro-cid-3ef6ksr2> <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" data-astro-cid-3ef6ksr2> <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" data-astro-cid-3ef6ksr2></path> </svg> </button> </div> <!-- Main header --> <div class="hidden md:block bg-transparent text-white px-6 pt-4 w-full" data-astro-cid-3ef6ksr2> <!-- Top Row --> <div class="grid grid-cols-3 items-center h-16 w-full px-5" data-astro-cid-3ef6ksr2> <!-- Left: Search --> <div class="flex items-center gap-2" data-astro-cid-3ef6ksr2> <input type="text" placeholder="Search" class="bg-transparent border-b border-white text-white text-sm placeholder:text-white/70 focus:outline-none h-6 px-1" data-astro-cid-3ef6ksr2> <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" data-astro-cid-3ef6ksr2> <circle cx="11" cy="11" r="8" data-astro-cid-3ef6ksr2></circle> <line x1="21" y1="21" x2="16.65" y2="16.65" data-astro-cid-3ef6ksr2></line> </svg> </div> <!-- Center: Logo --> <div class="flex justify-center" data-astro-cid-3ef6ksr2> <img src="/images/faslogochroma.png" alt="FAS Chrome Logo" class="h-16 transform scale-[2]" data-astro-cid-3ef6ksr2> </div> <!-- Right: My Account Toggle (opens AccountDashboard) --> <div class="flex justify-end" data-astro-cid-3ef6ksr2> <button id="accountToggle" aria-label="Open My Account" data-astro-cid-3ef6ksr2> <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" data-astro-cid-3ef6ksr2> <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" data-astro-cid-3ef6ksr2></path> </svg> </button> </div> </div> <!-- Divider --> <div class="w-[90%] h-px bg-white/40 mx-auto my-4" data-astro-cid-3ef6ksr2></div> <!-- Bottom Row --> <div class="grid grid-cols-3 items-center px-5 max-w-7xl mx-auto" data-astro-cid-3ef6ksr2> <!-- Left: Hamburger --> <div class="flex items-center justify-start relative" data-astro-cid-3ef6ksr2> <button id="categoryToggle" aria-label="Toggle Categories" data-astro-cid-3ef6ksr2> <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" data-astro-cid-3ef6ksr2> <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" data-astro-cid-3ef6ksr2></path> </svg> </button> <!-- Dropdown Menu (Categories Only) --> <div id="categoryDropdown" class="hidden absolute left-0 top-full mt-3 w-56 bg-black text-white border border-white/10 rounded-md shadow-lg z-50 font-borg text-sm py-2 px-3" data-astro-cid-3ef6ksr2> <button id="categoryClose" class="float-right text-white" data-astro-cid-3ef6ksr2>X</button> <a href="/igla" class="block py-1 hover:text-accent" data-astro-cid-3ef6ksr2>IGLA Anti-Theft</a> <a href="/power-packages" class="block py-1 hover:text-accent" data-astro-cid-3ef6ksr2>Power Packages</a> <a href="/porting" class="block py-1 hover:text-accent" data-astro-cid-3ef6ksr2>Porting</a> <a href="/services" class="block py-1 hover:text-accent" data-astro-cid-3ef6ksr2>Services</a> <a href="/schedule" class="block py-1 hover:text-accent" data-astro-cid-3ef6ksr2>Schedule Install</a> </div> </div> <!-- Center: Home | Shop --> <nav class="flex justify-center gap-4 text-sm font-ethno uppercase tracking-wider" data-astro-cid-3ef6ksr2> <a href="/" class="hover:text-accent" data-astro-cid-3ef6ksr2>Home</a> <span class="text-white/50" data-astro-cid-3ef6ksr2>|</span> <a href="/shop" class="hover:text-accent" data-astro-cid-3ef6ksr2>Shop</a> </nav> </div> </div> <!-- Scroll-triggered Sticky Header --> <div class="my-sticky-header fixed top-[35px] w-full z-50 hidden md:flex justify-center" data-astro-cid-3ef6ksr2> <div class="w-[90%] max-w-[1200px] mx-auto bg-black/20 backdrop-blur-md border border-white/10 rounded-[20px] px-4 py-3" data-astro-cid-3ef6ksr2> <!-- Sticky Header Inner Layout --> <div class="flex items-center justify-center w-full max-w-7xl mx-auto gap-4" data-astro-cid-3ef6ksr2> <!-- Logo --> <div class="flex-shrink-0" data-astro-cid-3ef6ksr2> <img src="/logo/chromelogofas.png" alt="FAS Chrome Logo" class="h-16" data-astro-cid-3ef6ksr2> </div> <!-- Nav --> <nav class="flex gap-4 text-sm font-ethno uppercase tracking-wider justify-center flex-1" data-astro-cid-3ef6ksr2> <a href="/" class="hover:text-accent" data-astro-cid-3ef6ksr2>Home</a> <span class="text-white/50" data-astro-cid-3ef6ksr2>|</span> <a href="/shop" class="hover:text-accent" data-astro-cid-3ef6ksr2>Shop</a> </nav> <!-- Search + Hamburger --> <div class="flex items-center gap-4 relative" data-astro-cid-3ef6ksr2> <!-- Search --> <div class="flex items-center gap-2" data-astro-cid-3ef6ksr2> <input type="text" placeholder="Search" class="bg-transparent border-b border-white text-white text-sm placeholder:text-white/70 focus:outline-none w-32" data-astro-cid-3ef6ksr2> <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" data-astro-cid-3ef6ksr2> <circle cx="11" cy="11" r="8" data-astro-cid-3ef6ksr2></circle> <line x1="21" y1="21" x2="16.65" y2="16.65" data-astro-cid-3ef6ksr2></line> </svg> </div> <!-- Hamburger --> <button id="stickyCategoryToggle" class="text-white" aria-label="Sticky Category Menu" data-astro-cid-3ef6ksr2> <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" data-astro-cid-3ef6ksr2> <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" data-astro-cid-3ef6ksr2></path> </svg> </button> <!-- Sticky Dropdown Menu --> <div id="stickyCategoryDropdown" class="hidden absolute right-4 top-full mt-3 w-56 bg-black text-white border border-white/10 rounded-md shadow-lg z-50 font-borg text-sm py-2 px-3" data-astro-cid-3ef6ksr2> <a href="/igla" class="block py-1 hover:text-accent" data-astro-cid-3ef6ksr2>IGLA Anti-Theft</a> <a href="/power-packages" class="block py-1 hover:text-accent" data-astro-cid-3ef6ksr2>Power Packages</a> <a href="/porting" class="block py-1 hover:text-accent" data-astro-cid-3ef6ksr2>Porting</a> <a href="/services" class="block py-1 hover:text-accent" data-astro-cid-3ef6ksr2>Services</a> <a href="/schedule" class="block py-1 hover:text-accent" data-astro-cid-3ef6ksr2>Schedule Install</a> </div> </div> </div> </div> </div> <aside id="accountDashboard" class="w-64 h-full bg-[#1a1a1a] font-ethno text-white p-6 shadow-lg space-y-6 fixed top-0 right-0 z-40 hidden" data-astro-cid-3ef6ksr2> <button id="closeAccountDashboard" class="absolute top-6 right-4 z-[99999] bg-transparent text-white p-2 rounded-full hover:bg-transparent hover:text-red-500 shadow-lg transition-all duration-200" data-astro-cid-3ef6ksr2>
&times;
</button> <h2 class="text-2xl font-bold mb-4 border-b border-gray-700 pb-2" data-astro-cid-3ef6ksr2>Account</h2> <nav class="flex flex-col space-y-4 font-semibold" data-astro-cid-3ef6ksr2> <a href="/account/orders" class="hover:text-primary transition-colors" data-astro-cid-3ef6ksr2>Orders</a> <a href="/account/settings" class="hover:text-primary transition-colors" data-astro-cid-3ef6ksr2>Settings</a> <a href="/garage-dashboard" class="hover:text-primary transition-colors" data-astro-cid-3ef6ksr2>My Garage</a> <a href="/account/addresses" class="hover:text-primary transition-colors" data-astro-cid-3ef6ksr2>Addresses</a> <a href="/account/logout" class="mt-10 text-red-500 hover:text-red-400 transition-colors" data-astro-cid-3ef6ksr2>Logout</a> </nav> </aside> </header> ${renderScript($$result, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/components/Header.astro?astro&type=script&index=0&lang.ts")} `;
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/components/Header.astro", void 0);

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<footer class="mt-20 bg-black text-white text-sm font-captain tracking-wider px-4 py-6"> <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-6 text-center"> <!-- Left: FAS Logo --> <div class="flex-shrink-0"> <img src="/images/faslogochroma.png" alt="F.A.S. Motorsports Logo" class="h-12"> </div> <!-- Right: Text and Links --> <div class="col-span-full md:col-span-2"> <div class="mb-4"> <p class="uppercase">Copyright © 2025 F.A.S. Motorsports</p> <p class="uppercase">All Rights Reserved by F.A.S. Motorsports</p> <p class="text-xs font-montserrat text-white/50 mt-2 flex items-center justify-center gap-2"> <img src="/logo/launchwell brands logo white.png" alt="LaunchWell Brands logo" class="h-4">
Website by <a href="https://launchwellbrands.com" class="font-montserrat hover:text-accent">LaunchWell Brands</a> </p> </div> <div class="space-x-2"> <a href="/privacypolicy" class="hover:text-accent transition-colors duration-300">Privacy Policy</a> <span class="text-white/50">|</span> <a href="/warranty" class="hover:text-accent transition-colors duration-300">Warranty</a> <span class="text-white/50">|</span> <a href="/termsandconditions" class="hover:text-accent transition-colors duration-300">Terms &amp; Conditions</a> </div> </div> </div> </footer>`;
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/components/footer.astro", void 0);

const $$FloatingLoginGarage = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div class="garage-login-btn" onclick="window.location.href='/garage-login'" data-astro-cid-kpjcmqtk>
🔧 Garage Login
</div>`;
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/components/FloatingLoginGarage.astro", void 0);

function FloatingCartWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [cartItems, setCartItems] = useState([
    { id: 1, name: "Stage 2 Charger Tune", quantity: 1, price: 2499 }
  ]);
  const subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setIsOpen(true),
        className: "fixed bottom-20 right-6 z-50 bg-white text-black p-4 rounded-full shadow-lg hover:bg-primary hover:text-white transition-all duration-300 flex items-center justify-center",
        children: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h11.1M7 13L5.4 5M16 16a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" }) })
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        id: "side-cart",
        className: `fixed top-0 right-0 w-full sm:w-[450px] h-full bg-black/90 text-white z-50 transition-transform duration-300 transform ${isOpen ? "translate-x-0" : "translate-x-full"}`,
        children: [
          /* @__PURE__ */ jsxs("div", { className: "p-4 flex justify-between items-center border-b border-white/10", children: [
            /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold font-captain", children: "Cart" }),
            /* @__PURE__ */ jsx("button", { onClick: () => setIsOpen(false), className: "text-white text-2xl", children: "×" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "p-4 overflow-y-auto h-[calc(100%-12rem)]", children: cartItems.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center text-gray-400", children: [
            /* @__PURE__ */ jsx("p", { className: "mb-4", children: "Your cart is empty." }),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/shop",
                className: "inline-block bg-white text-black px-4 py-2 rounded font-bold transition-all hover:bg-primary hover:!text-white focus:!text-white active:!text-white",
                children: "Shop Now"
              }
            )
          ] }) : cartItems.map((item) => /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center border-b border-white/10 py-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: item.name }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-gray-400", children: [
                item.quantity,
                "x • $",
                item.price.toFixed(2)
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxs("p", { className: "text-sm font-bold", children: [
                "$",
                (item.quantity * item.price).toFixed(2)
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setCartItems(cartItems.filter((ci) => ci.id !== item.id)),
                  className: "text-red-400 hover:text-red-600 text-lg",
                  title: "Remove",
                  children: "×"
                }
              )
            ] })
          ] }, item.id)) }),
          /* @__PURE__ */ jsxs("div", { className: "p-4 border-t border-white/10", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between mb-4", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-lg", children: "Subtotal" }),
              /* @__PURE__ */ jsxs("span", { className: "font-bold text-primary text-lg", children: [
                "$",
                subtotal.toFixed(2)
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: async () => {
                  const res = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      sessionId: window.localStorage.getItem("fas_session") || "guest-session"
                    })
                  });
                  const data = await res.json();
                  if (data.url) {
                    window.location.href = data.url;
                  } else {
                    alert("Unable to start checkout. Please try again.");
                  }
                },
                className: "block w-full bg-primary text-black py-3 rounded hover:opacity-90 transition-all font-bold tracking-wide",
                children: "Proceed to Checkout"
              }
            )
          ] })
        ]
      }
    )
  ] });
}

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a || (_a = __template(['<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title><slot name="title" /></title><script async', ' src="https://clerk.js.cool"></script>', `</head> <body class="relative bg-cover bg-center bg-fixed text-white" style="background-image: url('/images/bg-texture copy.png'); background-color: transparent;"> <div class="absolute inset-0 bg-black/10 backdrop-blur-sm z-0"></div> <div class="relative z-10"> `, ' <main class="min-h-screen px-4 sm:px-8 lg:px-16 bg-transparent"> ', " </main> ", " ", " ", " </div> </body></html>"])), addAttribute("pk_test_ZXhjaXRpbmctbW9zcXVpdG8tOTIuY2xlcmsuYWNjb3VudHMuZGV2JA", "data-clerk-frontend-api"), renderHead(), renderComponent($$result, "Header", $$Header, {}), renderSlot($$result, $$slots["default"]), renderComponent($$result, "Footer", $$Footer, {}), renderComponent($$result, "FloatingCartWidget", FloatingCartWidget, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/components/floatingwidget.jsx", "client:component-export": "default" }), renderComponent($$result, "FloatingLoginGarage", $$FloatingLoginGarage, {}));
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/layouts/BaseLayout.astro", void 0);

export { $$BaseLayout as $ };
