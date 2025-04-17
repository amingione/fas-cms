import { clerkMiddleware } from "@clerk/astro/server";

export const onRequest = clerkMiddleware({
  publishableKey: process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
});