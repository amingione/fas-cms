import { sanity } from '@/server/sanity-client';

export async function fetchVendorOrders(vendorId: string, status?: string) {
  const vendor = await sanity.fetch(
    '*[_type == "vendor" && _id == $vendorId][0]{customerRef}',
    { vendorId }
  );
  const customerId = vendor?.customerRef?._ref;
  if (!customerId) return [];
  const query = `*[_type == "order" && orderType == "wholesale" && customerRef._ref == $customerId${status ? ' && status == $status' : ''}]
    | order(dateTime(coalesce(createdAt, _createdAt)) desc){
      _id,
      orderNumber,
      status,
      createdAt,
      totalAmount,
      amountSubtotal,
      amountTax,
      amountShipping,
      currency,
      cart[]{
        _key,
        name,
        sku,
        quantity,
        price,
        total,
        productRef->{_id, title, sku, "image": coalesce(images[0].asset->url, mainImage.asset->url, thumbnail.asset->url)}
      }
    }`;
  return sanity.fetch(query, { customerId, ...(status ? { status } : {}) });
}

export async function fetchVendorInventory(vendorId: string) {
  const query = `*[_type == "vendorProduct" && vendor._ref == $vendorId] | order(product->title asc){
    _id,
    product->{_id, title, sku, "image": featuredImage.asset->url},
    vendorSku,
    cost,
    quantityAvailable,
    leadTime,
    minimumOrder,
    lastUpdated,
    active
  }`;
  return sanity.fetch(query, { vendorId });
}

export async function updateVendorInventory(
  items: Array<{ _id: string; quantityAvailable?: number; leadTime?: number }>
) {
  const tx = sanity.transaction();
  items.forEach((item) => {
    const patch: Record<string, any> = {};
    if (typeof item.quantityAvailable === 'number') {
      patch.quantityAvailable = item.quantityAvailable;
    }
    if (typeof item.leadTime === 'number') {
      patch.leadTime = item.leadTime;
    }
    if (Object.keys(patch).length) {
      tx.patch(item._id, { set: patch });
    }
  });
  return tx.commit();
}

export async function fetchVendorInvoices(vendorId: string) {
  const vendor = await sanity.fetch(
    '*[_type == "vendor" && _id == $vendorId][0]{customerRef}',
    { vendorId }
  );
  const customerId = vendor?.customerRef?._ref;
  if (!customerId) return [];
  const query = `*[_type == "invoice" && customerRef._ref == $customerId] | order(invoiceDate desc){
    _id,
    invoiceNumber,
    status,
    invoiceDate,
    dueDate,
    total,
    amountPaid,
    amountDue,
    customerRef->{companyName}
  }`;
  return sanity.fetch(query, { customerId });
}

export async function fetchVendorPayments(vendorId: string) {
  const query = `*[_type == "bill" && vendor._ref == $vendorId] | order(dueDate desc){
    _id,
    description,
    amount,
    dueDate,
    paid,
    paidDate,
    checkNumber
  }`;
  return sanity.fetch(query, { vendorId });
}

export async function fetchVendorProducts(vendorId: string) {
  const query = `*[_type == "vendorProduct" && vendor._ref == $vendorId]{
    _id,
    product->{_id, title, sku, price, status, "image": featuredImage.asset->url},
    vendorSku,
    cost,
    active,
    lastUpdated
  }`;
  return sanity.fetch(query, { vendorId });
}

export async function updateVendorProducts(
  items: Array<{ _id: string; cost?: number; active?: boolean }>
) {
  const tx = sanity.transaction();
  items.forEach((item) => {
    const patch: Record<string, any> = {};
    if (typeof item.cost === 'number') patch.cost = item.cost;
    if (typeof item.active === 'boolean') patch.active = item.active;
    if (Object.keys(patch).length) {
      tx.patch(item._id, { set: patch });
    }
  });
  return tx.commit();
}

export async function fetchVendorAnalytics(vendorId: string, startOfMonth: string) {
  const totalOrdersQuery = `count(*[_type == "purchaseOrder" && vendor._ref == $vendorId])`;
  const revenueQuery = `*[_type == "purchaseOrder" && vendor._ref == $vendorId && orderDate >= $startOfMonth]{ "total": subtotal + tax + shipping }`;
  const topProductsQuery = `*[_type == "purchaseOrder" && vendor._ref == $vendorId]{ lineItems[] }`;
  const [totalOrders, revenues, topProductsRaw] = await Promise.all([
    sanity.fetch(totalOrdersQuery, { vendorId }),
    sanity.fetch(revenueQuery, { vendorId, startOfMonth }),
    sanity.fetch(topProductsQuery, { vendorId })
  ]);

  const revenueThisMonth = Array.isArray(revenues)
    ? revenues.reduce((sum, entry: any) => sum + (Number(entry?.total) || 0), 0)
    : 0;

  const productCounts: Record<string, number> = {};
  if (Array.isArray(topProductsRaw)) {
    topProductsRaw.forEach((order: any) => {
      if (order?.lineItems) {
        order.lineItems.forEach((li: any) => {
          const name = li?.product?.title || li?.product?.sku || 'Unknown';
          const qty = Number(li?.quantity) || 0;
          productCounts[name] = (productCounts[name] || 0) + qty;
        });
      }
    });
  }

  const topProducts = Object.entries(productCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalOrders, revenueThisMonth, topProducts };
}

export async function fetchVendorDocuments(vendorId: string) {
  const query = `*[_type == "vendorDocument" && (sharedWithAllVendors == true || vendor._ref == $vendorId)] | order(uploadedAt desc){
    _id,
    title,
    description,
    category,
    version,
    sharedWithAllVendors,
    uploadedAt,
    uploadedBy,
    file{
      asset->{url, originalFilename, mimeType, size}
    }
  }`;
  return sanity.fetch(query, { vendorId });
}
