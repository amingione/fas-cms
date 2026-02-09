import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ params, request }) => {
  const ctx = await requireVendor(request, 'upload_invoices');
  if (!ctx.ok) return ctx.response;
  const id = params.id;
  try {
    const query = `*[_type == "invoice" && _id == $id && vendorRef._ref == $vendorId][0]{
      _id,
      invoiceNumber,
      status,
      invoiceDate,
      dueDate,
      total,
      amountPaid,
      amountDue,
      customerRef->{companyName},
      vendorOrderRef->{_id, orderNumber},
      lineItems[]{
        description,
        quantity,
        unitPrice,
        lineTotal,
        sku
      }
    }`;
    const invoice = await sanity.fetch(query, { id, vendorId: ctx.vendorId });
    if (!invoice) return jsonResponse({ message: 'Not found' }, { status: 404 }, { noIndex: true });
    return jsonResponse({ invoice }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor invoice detail] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
