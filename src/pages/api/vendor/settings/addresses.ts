import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';
import {
  vendorSettingsAddressCreateSchema,
  vendorSettingsAddressUpdateSchema,
  vendorSettingsAddressDeleteSchema
} from '@/lib/validators/api-requests';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const vendor = await sanity.fetch(
      '*[_type == "vendor" && _id == $vendorId][0]{shippingAddresses}',
      { vendorId: ctx.vendorId }
    );
    return jsonResponse(
      { addresses: vendor?.shippingAddresses || [] },
      { status: 200 },
      { noIndex: true }
    );
  } catch (err) {
    console.error('[vendor settings addresses GET] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const bodyResult = vendorSettingsAddressCreateSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorSettingsAddressCreateSchema',
        context: 'api/vendor/settings/addresses',
        identifier: ctx.vendorId || 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 },
        { noIndex: true }
      );
    }
    const newAddress = bodyResult.data;
    await sanity
      .patch(ctx.vendorId)
      .setIfMissing({ shippingAddresses: [] })
      .append('shippingAddresses', [newAddress])
      .commit();
    return jsonResponse({ ok: true }, { status: 201 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor settings addresses POST] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const bodyResult = vendorSettingsAddressUpdateSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorSettingsAddressUpdateSchema',
        context: 'api/vendor/settings/addresses',
        identifier: ctx.vendorId || 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 },
        { noIndex: true }
      );
    }
    const { index, address } = bodyResult.data;
    await sanity.patch(ctx.vendorId).set({ [`shippingAddresses[${index}]`]: address }).commit();
    return jsonResponse({ ok: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor settings addresses PATCH] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;
  try {
    const bodyResult = vendorSettingsAddressDeleteSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorSettingsAddressDeleteSchema',
        context: 'api/vendor/settings/addresses',
        identifier: ctx.vendorId || 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return jsonResponse(
        { error: 'Validation failed', details: bodyResult.error.format() },
        { status: 422 },
        { noIndex: true }
      );
    }
    const { index } = bodyResult.data;
    const vendor = await sanity.fetch(
      '*[_type == "vendor" && _id == $vendorId][0]{shippingAddresses}',
      { vendorId: ctx.vendorId }
    );
    const addresses: any[] = Array.isArray(vendor?.shippingAddresses) ? vendor.shippingAddresses : [];
    const next = addresses.filter((_, i) => i !== index);
    await sanity.patch(ctx.vendorId).set({ shippingAddresses: next }).commit();
    return jsonResponse({ ok: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor settings addresses DELETE] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
