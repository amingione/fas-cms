import { client } from './sanityClient';

export async function getCustomerData(userId: string) {
  const query = `*[_type == "customer" && _id == $userId][0]{
    fullName,
    email,
    phone,
    billingAddress,
    shippingAddress,
    vehicle,
    notes,
    quotes[]->{
      _id,
      title
    }
  }`;
  return await client.fetch(query, { userId });
}