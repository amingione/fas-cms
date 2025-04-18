import { clerkMiddleware } from "@clerk/astro/server";

export const onRequest = clerkMiddleware({
  publishableKey: import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
});