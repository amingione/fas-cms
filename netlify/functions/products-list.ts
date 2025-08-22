import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    requireUser(event);
    const q = `*[_type=="product"]|order(_createdAt desc)[0...200]{
      _id, title, sku, price, featured, 
      "categoryNames": categories[]->title,
      "imageUrl": coalesce(image.asset->url, "")
    }`;
    const data = await sanity.fetch(q);
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
