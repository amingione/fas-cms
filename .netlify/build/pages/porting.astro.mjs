import { e as createComponent, i as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_CMKpZIe-.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Bgc6huvc.mjs';
import { $ as $$Button } from '../chunks/Button_nnyaC07T.mjs';
export { renderers } from '../renderers.mjs';

const $$Porting = createComponent(($$result, $$props, $$slots) => {
  const portingItems = [
    { title: "Supercharger", desc: "CNC and hand porting improves airflow and boost efficiency. Gains of 20\u201340+ WHP are common when paired with tuning." },
    { title: "Bearing Plate", desc: "Porting and profiling reduce turbulence and drag on the rotor path, enhancing blower response." },
    { title: "Snout", desc: "Porting the snout increases intake velocity and efficiency, crucial for maximizing your supercharger\u2019s output." },
    { title: "Whipple", desc: "Precision Whipple porting can dramatically increase airflow and power, especially in high-boost setups." },
    { title: "Throttle Body", desc: "Port-matched throttle bodies reduce intake restriction and improve throttle response and power delivery." },
    { title: "Cylinder Head", desc: "Full porting improves combustion efficiency, flow, and performance \u2014 essential for high-RPM and boosted builds." },
    { title: "Intake Manifold", desc: "A ported intake manifold optimizes air distribution to each cylinder, supporting high-HP goals with better balance." }
  ];
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {}, { "default": ($$result2) => renderTemplate`  ${maybeRenderHead()}<section class="bg-transparent text-white py-20 px-4"> <div class="max-w-7xl mx-auto"> <div class="text-center mb-16"> <h1 class="text-5xl font-borg text-accent mb-6">
F.a.S. <span class="font-ethno">Porting Services</span> </h1> <p class="text-xl font-captain tracking-[1.2px] text-primary max-w-3xl mx-auto">
Porting is the core of what built FAS Motorsports — the foundation of our performance legacy. Our precision porting services are designed to maximize airflow and power across platforms.
</p> </div> </div> </section>  <div class="font-ethno text-center mb-20"> ${renderComponent($$result2, "Button", $$Button, { "text": "Send in your snout today", "href": "/schedule", "variant": "swipe" })} </div>  <div class="grid md:grid-cols-2 gap-12 items-start mb-20"> <div> <h2 class="text-3xl font-cyber text-white mb-4">What is Porting?</h2> <p class="text-base font-captain tracking-[1.2px] text-gray-300 mb-4">
Porting refers to the process of modifying the intake and exhaust ports of an internal combustion engine to improve airflow. By removing restrictions and reshaping passages, porting enhances combustion efficiency and maximizes power output.
</p> <p class="text-base font-captain tracking-[1.2px] text-gray-300 mb-4">
At FAS Motorsports, we apply proven race and dyno-tested porting strategies tailored to your platform. Whether it’s cylinder heads, superchargers, throttle bodies or manifolds, every component is CNC matched and hand-finished for optimal performance.
</p> <p class="text-base font-captain tracking-[1.2px] text-gray-300">
This isn't guesswork — it's precision craftsmanship backed by real-world data. Porting is the critical link between air, fuel, and horsepower, and we do it better than anyone in the business.
</p> </div> <div class="rounded overflow-hidden shadow-lg"> <img src="/images/E2A36CB5-549B-4B17-9E4A-6F1DEB8D8A82.PNG" alt="Ported Supercharger Example by FAS" class="w-full h-auto rounded shadow-md"> </div> </div>  <div class="mt-24"> <h2 class="text-4xl font-cyber3dfilled-italic text-primary mb-8 text-center">Popular Porting Packages</h2> <div class="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 justify-center"> <div class="bg-transparent p-6 rounded shadow-md text-left"> <img src="/images/dominator race package.png" alt="2.4L Hellcat Dominator" class="rounded mb-4"> <h3 class="text-base font-ethno text-white mb-2">2.4L Hellcat “DOMINATOR” Race Porting Package</h3> <p class="text-xl font-cyber tracking-[1.2px] text-primary">$2,175.00</p> </div> <div class="bg-transparent p-6 rounded shadow-md text-left"> <img src="/images/2.7 dominator package.png" alt="2.7L Redeye Demon Dominator" class="rounded mb-4"> <h3 class="text-base font-ethno text-white mb-2">2.7L Redeye/Demon “DOMINATOR” Race Porting Package</h3> <p class="text-xl font-cyber tracking-[1.2px] text-primary">$2,175.00</p> </div> </div> </div>  <div class="mt-24"> <h2 class="text-4xl font-cyber text-accent mb-8 text-center">What Can You Send In?</h2> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"> ${portingItems.map((item) => renderTemplate`<div class="bg-[#1a1a1a] p-6 rounded shadow-md"> <h3 class="text-2xl font-borg text-white mb-2">${item.title}</h3> <p class="text-sm font-cyber-italic tracking-[1.2px] text-gray-300">${item.desc}</p> </div>`)} </div> </div>  <div class="font-ethno text-primary text-center mt-20"> ${renderComponent($$result2, "Button", $$Button, { "text": "Let's Talk Porting", "href": "/schedule", "variant": "multi-swipe" })} </div> ` })}`;
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/porting.astro", void 0);

const $$file = "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/porting.astro";
const $$url = "/porting";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Porting,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
