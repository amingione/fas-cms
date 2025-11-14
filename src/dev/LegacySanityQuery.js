import express from 'express';
import { sanityClient } from '@/lib/sanityClient';

const app = express();

app.get('/api/products', async (req, res) => {
  try {
    const { category, tune, hp, page = 1 } = req.query;
    const pageSize = 9;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const query = `*[
      _type == "product" &&
      !(_id in path('drafts.**')) &&
      lower(coalesce(status, "active")) == "active" &&
      (!defined(category) || category == $category) &&
      (!defined(tune) || tune_required == $tune) &&
      (!defined(hp) || horsepower <= $hp)
    ] | order(_createdAt desc) [$start...$end] {
      _id,
      title,
      price,
      horsepower,
      tune_required,
      slug { current },
      images[]{ asset->{ url } }
    }`;

    const params = {
      ...(category && { category }),
      ...(tune && { tune }),
      ...(hp && { hp: parseInt(hp) }),
      start,
      end
    };

    const products = await sanityClient.fetch(query, params);
    const totalCount = await sanityClient.fetch(
      `count(*[
      _type == "product" &&
      !(_id in path('drafts.**')) &&
      lower(coalesce(status, "active")) == "active" &&
      (!defined(category) || category == $category) &&
      (!defined(tune) || tune_required == $tune) &&
      (!defined(hp) || horsepower <= $hp)
    ])`,
      params
    );

    res.json({ products, totalPages: Math.ceil(totalCount / pageSize) });
  } catch (_err) {
    console.error(_err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});
