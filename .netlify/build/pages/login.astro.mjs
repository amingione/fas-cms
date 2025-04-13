import { e as createComponent, i as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_CMKpZIe-.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Bgc6huvc.mjs';
export { renderers } from '../renderers.mjs';

const $$Login = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="min-h-screen flex items-center justify-center bg-black text-white"> <div class="w-full max-w-md p-6 bg-white/5 rounded-xl backdrop-blur border border-white/10"> <h1 class="text-center text-2xl font-bold mb-4">Sign In to FAS Motorsports</h1> ${renderComponent($$result2, "clerk-sign-in", "clerk-sign-in", {})} </div> </section> ` })}`;
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/login.astro", void 0);

const $$file = "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/login.astro";
const $$url = "/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
