import { e as createComponent, i as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_CMKpZIe-.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Bgc6huvc.mjs';
export { renderers } from '../renderers.mjs';

const $$Schedule = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="px-6 py-24 max-w-6xl mx-auto text-center"> <h1 class="text-4xl font-cyber text-accent mb-4">Schedule Your Install</h1> <p class="text-lg font-captain tracking-[1.2px] text-[#1d92ea] mb-12">
Select a time that works for you — we’ll handle the rest. This is the first step toward securing your build.
</p> <div class="w-full h-[800px]"> <iframe src="https://calendly.com/fasmotorsports-support" width="100%" height="800" frameborder="0" class="rounded-md shadow-lg" title="Schedule with FAS Motorsports"></iframe> </div> </section> ` })}`;
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/schedule.astro", void 0);

const $$file = "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/schedule.astro";
const $$url = "/schedule";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Schedule,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
