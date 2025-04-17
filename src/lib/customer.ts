import { client } from './sanityClient.ts';

export async function getCustomerData(userId: string) {
  const query = `*[_type == "customer" && _id == $userId][0]{
    email,
    phone,
    billingAddress,
    shippingAddress,
    quotes[] {
      _key,
      title
    }
  }`;
  return await client.fetch(query, { userId });
}