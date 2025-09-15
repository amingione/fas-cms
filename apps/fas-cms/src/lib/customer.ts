import { sanityClient as client } from './sanityClient';

export async function getCustomerData(customerId: string) {
  const query = `*[_type == "customer" && _id == $customerId][0]{
    _id,
    fullName,
    email,
    phone,
    billingAddress,
    shippingAddress,
    stripeCustomerId,
    vehicle,
    notes,
    quotes[]->{
      _id,
      title,
      total,
      status
    },
    "createdAt": _createdAt
  }`;
  return await client.fetch(query, { customerId });
}
