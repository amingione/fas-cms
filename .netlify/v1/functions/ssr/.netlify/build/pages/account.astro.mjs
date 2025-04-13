import { e as createComponent, i as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_CMKpZIe-.mjs';
import 'kleur/colors';
import 'html-escaper';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_Bgc6huvc.mjs';
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Account = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {}, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([" ", "<h1>My Account</h1> <script type=\"module\">\n    import { Clerk } from '@clerk/clerk-js';\n\n    const clerk = new Clerk(import.meta.env.PUBLIC_CLERK_FRONTEND_API);\n    await clerk.load();\n\n    if (clerk.user) {\n      const email = clerk.user.emailAddresses[0].emailAddress;\n      document.body.innerHTML += `<p>Welcome, ${email}</p>`;\n    }\n  </script> "], [" ", "<h1>My Account</h1> <script type=\"module\">\n    import { Clerk } from '@clerk/clerk-js';\n\n    const clerk = new Clerk(import.meta.env.PUBLIC_CLERK_FRONTEND_API);\n    await clerk.load();\n\n    if (clerk.user) {\n      const email = clerk.user.emailAddresses[0].emailAddress;\n      document.body.innerHTML += \\`<p>Welcome, \\${email}</p>\\`;\n    }\n  </script> "])), maybeRenderHead()) })}`;
}, "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/account.astro", void 0);
const $$file = "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms/src/pages/account.astro";
const $$url = "/account";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Account,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
