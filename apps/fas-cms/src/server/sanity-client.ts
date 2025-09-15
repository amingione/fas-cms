import { SanityClient } from '@sanity/client';

/**
 * A thin wrapper around the Sanity client.  Reads configuration from
 * environment variables.  Use this in your API routes to fetch data from
 * the content studio.  See `/packages/schemas` for the shape of the
 * documents.
 */

export const sanity = new SanityClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2023-10-25',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_READ_TOKEN,
  useCdn: false,
});

/** Fetch a customer document by its unique user identifier.  The Sanity
 * schema stores the authentication subject identifier in the `userSub`
 * field rather than `auth0Sub` to avoid referencing a specific auth
 * provider.  This helper accepts the JWT `sub` claim and queries
 * against the `userSub` field. */
export async function getCustomerBySub(sub: string) {
  const query = '*[_type == "customer" && userSub == $sub][0]';
  return await sanity.fetch(query, { sub });
}

/** Fetch a vendor document by its unique user identifier.  See
 * {@link getCustomerBySub} for more information on the `userSub` field. */
export async function getVendorBySub(sub: string) {
  const query = '*[_type == "vendor" && userSub == $sub][0]';
  return await sanity.fetch(query, { sub });
}

export async function getOrdersForCustomer(customerId: string) {
  const query = '*[_type == "order" && customer._ref == $cid] | order(createdAt desc) { ..., customer->{name, email}, vendor->{name, email} }';
  return await sanity.fetch(query, { cid: customerId });
}

export async function getOrdersForVendor(vendorId: string) {
  const query = '*[_type == "order" && vendor._ref == $vid] | order(createdAt desc) { ..., customer->{name, email}, vendor->{name, email} }';
  return await sanity.fetch(query, { vid: vendorId });
}

export async function getAllOrders() {
  const query = '*[_type == "order"] | order(createdAt desc) { ..., customer->{name, email}, vendor->{name, email} }';
  return await sanity.fetch(query, {});
}

export async function getVendorByEmail(email: string) {
  const query = '*[_type == "vendor" && email == $email][0]';
  return await sanity.fetch(query, { email });
}

export async function getVendorOrdersByVendorId(vendorId: string) {
  const query = '*[_type == "vendor" && _id == $vid][0].orders[] { orderId, status, amount, orderDate }';
  return await sanity.fetch(query, { vid: vendorId });
}

export async function getOrderById(orderId: string) {
  const query = '*[_type == "order" && _id == $id][0] { ..., customer->{name, email}, vendor->{name, email} }';
  return await sanity.fetch(query, { id: orderId });
}
