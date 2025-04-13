import { e as createComponent, i as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_CMKpZIe-.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Bgc6huvc.mjs';
export { renderers } from '../renderers.mjs';

const $$Warranty = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {}, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="py-20 px-4 max-w-5xl mx-auto text-white font-captain tracking-[1.2px]"> <h1 class="text-4xl font-cyber text-accent mb-10 text-center">Warranty Policy</h1> <p class="mb-6">
F.A.S. Motorsports is committed to delivering high-performance products and services. Due to the nature of automotive performance modifications and aftermarket tuning, we do not offer warranties on any products, components, or services rendered.
</p> <h2 class="text-2xl font-cyber text-white mt-10 mb-2">No Manufacturer or Performance Guarantee</h2> <p class="mb-4">
All parts and services offered by F.A.S. Motorsports are for high-performance, off-road, or race-use applications only and are sold "as is." Installation and use of such products may void your vehicle’s factory warranty. It is the customer’s responsibility to confirm compliance with manufacturer terms and regional laws.
</p> <h2 class="text-2xl font-cyber text-white mt-10 mb-2">Aftermarket Risk Assumption</h2> <p class="mb-4">
Due to the increased stress placed on vehicle components when modified, aftermarket parts and tuning inherently carry a higher risk of failure or wear. F.A.S. Motorsports assumes no liability for damages, failures, or unintended consequences resulting from the use or installation of performance parts or services.
</p> <h2 class="text-2xl font-cyber text-white mt-10 mb-2">Customer Responsibility</h2> <p class="mb-4">
Customers acknowledge that all purchases are made at their own risk. We strongly recommend professional installation and regular maintenance of all performance products. F.A.S. Motorsports is not liable for improper installation, tuning, or vehicle misuse.
</p> <h2 class="text-2xl font-cyber text-white mt-10 mb-2">Contact Us</h2> <p class="mb-4">
For questions or additional clarification on this policy, please contact our team at <a href="mailto:info@fasmotorsports.com" class="text-accent hover:text-white">info@fasmotorsports.com</a>.
</p> </section> ` })}`;
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/warranty.astro", void 0);

const $$file = "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/warranty.astro";
const $$url = "/warranty";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Warranty,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
