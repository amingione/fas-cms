import { e as createComponent, f as createAstro, r as renderTemplate, i as renderComponent, j as renderScript, m as maybeRenderHead, h as addAttribute } from '../../chunks/astro/server_CMKpZIe-.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_Bgc6huvc.mjs';
export { renderers } from '../../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  const query = `*[_type == "wooProduct" && slug.current == "${slug}"][0] {
  _id,
  name,
  price,
  horsepower,
  tune_required,
  images[]{ asset->{ url } },
  description
}`;
  const response = await fetch(`https://${"r4og35qd"}.api.sanity.io/v1/data/query/production?query=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${"skoeoWxQQxLGGnG1ImQglnNm1vrxk4R6wWTfvoHAuSAW4RbqBCFCH7KKW8dlH1CBiaIZiZ3jIJf1ALLz2qoApjokBbCaFe3Pdh1k3734VE6iFXVHdqrpIgs18zg0PfOtAHg09ZlR4scOSJ49vdbBFU5E8iPPDfnFJKSQArwdwVYvOK4tM1Gv"}`
    }
  });
  const product = (await response.json()).result;
  if (!product) {
    throw new Error(`Product with slug "${slug}" not found.`);
  }
  return renderTemplate(_a || (_a = __template(["", '<div id="toast" class="fixed bottom-6 right-6 z-50 hidden px-4 py-3 rounded-lg bg-white/90 text-black shadow-lg font-semibold transition-all duration-300 opacity-0"></div> ', ' <script type="application/json" id="product-data">\n  {JSON.stringify(product)}\n</script> ', ""])), maybeRenderHead(), renderScript($$result, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/shop/[slug].astro?astro&type=script&index=0&lang.ts"), renderComponent($$result, "BaseLayout", $$BaseLayout, {}, { "default": async ($$result2) => renderTemplate` <section class="py-12 max-w-6xl mx-auto px-4"> <nav class="text-sm text-gray-400 mb-6"> <a href="/" class="hover:text-white">Home</a> /
<a href="/shop" class="hover:text-white">Shop</a> /
<span class="text-white font-medium">${product.name}</span> </nav> <div class="grid md:grid-cols-2 gap-10 items-start"> <img${addAttribute(product.images?.[0]?.asset?.url || "/images/placeholder.png", "src")}${addAttribute(product.name, "alt")} class="rounded-lg w-full object-cover shadow-lg"> <div> <h1 class="text-4xl font-bold text-white mb-4">${product.name}</h1> <p class="text-2xl text-accent font-bold mb-4">$${product.price}</p> <p class="text-white/80 mb-6">${product.description || "No description available."}</p> <ul class="text-white/60 mb-6 space-y-1 text-sm"> <li><strong>Horsepower:</strong> ${product.horsepower || "N/A"}</li> <li><strong>Tune Required:</strong> ${product.tune_required || "Unknown"}</li> </ul> <div class="flex space-x-4 overflow-x-auto mb-6"> ${product.images?.map((img, i) => renderTemplate`<img${addAttribute(img.asset?.url, "src")}${addAttribute(`Image ${i + 1}`, "alt")} class="h-24 w-24 rounded object-cover border border-white/10">`)} </div> <button id="add-to-cart" class="bg-accent text-black px-6 py-3 rounded font-bold hover:bg-red-600 transition">
Add to Cart
</button> </div> </div> </section> <section class="mt-20"> <h2 class="text-2xl font-semibold text-white mb-6">Related Products</h2> <div class="grid md:grid-cols-3 gap-6"> <div class="bg-white/5 rounded-lg p-4 text-white text-center opacity-50">Coming Soon</div> <div class="bg-white/5 rounded-lg p-4 text-white text-center opacity-50">Coming Soon</div> <div class="bg-white/5 rounded-lg p-4 text-white text-center opacity-50">Coming Soon</div> </div> </section> ` }));
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/shop/[slug].astro", void 0);
const $$file = "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/shop/[slug].astro";
const $$url = "/shop/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
