app.get('/api/products', async (req, res) => {
  const { category, tune, hp, page = 1 } = req.query;
  const pageSize = 9;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  const query = `*[
    _type == "wooProduct" &&
    (!defined($category) || category == $category) &&
    (!defined($tune) || tune_required == $tune) &&
    (!defined($hp) || horsepower <= $hp)
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
    category,
    tune,
    hp: parseInt(hp),
    start,
    end
  };

  const products = await sanityClient.fetch(query, params);
  const totalCount = await sanityClient.fetch(`count(*[
    _type == "wooProduct" &&
    (!defined($category) || category == $category) &&
    (!defined($tune) || tune_required == $tune) &&
    (!defined($hp) || horsepower <= $hp)
  ])`, params);

  res.json({ products, totalPages: Math.ceil(totalCount / pageSize) });
});