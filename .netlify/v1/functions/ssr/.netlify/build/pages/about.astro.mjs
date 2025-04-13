import { e as createComponent, i as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_CMKpZIe-.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Bgc6huvc.mjs';
export { renderers } from '../renderers.mjs';

const $$About = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="relative w-full h-[60vh] bg-cover bg-center flex items-center justify-center text-white" style="background-image: url('https://fasmotorsports.com/wp-content/uploads/2023/04/FAS-Background-IGLA-scaled.jpg');"> <div class="bg-black bg-opacity-60 p-6 rounded"> <h1 class="text-4xl font-bold font-ethno uppercase text-center">About F.A.S. Motorsports</h1> </div> </section> <section class="max-w-5xl mx-auto py-16 px-6 space-y-12 text-white"> <div class="space-y-4"> <h2 class="text-2xl font-bold font-cyber text-primary">Performance | Precision | Power</h2> <p class="font-captain text-graylight leading-relaxed">
F.A.S. Motorsports was born from a passion for building some of the fastest cars in the nation. We specialize in high-performance Dodge, Jeep, and Ram platforms, offering tuning, IGLA anti-theft solutions, porting, custom power packages, and more.
</p> </div> <div class="grid grid-cols-1 md:grid-cols-2 gap-10 items-center"> <img src="https://fasmotorsports.com/wp-content/uploads/2023/04/fas-motorsports-about-engine-bay.jpg" alt="Engine Bay" class="rounded-lg shadow-md"> <div class="space-y-4"> <h2 class="font-ethno text-xl uppercase">Why Choose F.A.S.?</h2> <ul class="list-disc list-inside text-graylight font-captain"> <li>Certified IGLA Anti-Theft Installer</li> <li>Custom Horsepower Packages</li> <li>Extensive experience with Hellcats, Trackhawks, and TRX</li> <li>Proven track records and customer satisfaction</li> </ul> </div> </div> <div class="text-center mt-20"> <h3 class="text-xl font-bold font-cyber text-secondary mb-4">Ready to transform your build?</h3> <a href="/schedule" class="inline-block font-ethno uppercase bg-accent text-black px-8 py-3 rounded hover:bg-secondary transition">
Schedule Your Install
</a> </div> </section> ` })}`;
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/about.astro", void 0);

const $$file = "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/about.astro";
const $$url = "/about";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$About,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
