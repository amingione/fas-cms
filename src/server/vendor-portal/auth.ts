import { readSession } from '@/server/auth/session';
import { getVendorById } from '@/server/sanity-client';
import { jsonResponse, unauthorizedJson } from '@/server/http/responses';

type Permission =
  | 'view_own_orders'
  | 'create_wholesale_orders'
  | 'view_own_quotes'
  | 'view_wholesale_catalog'
  | 'send_support_messages'
  | 'view_payments'
  | 'view_analytics'
  | 'upload_invoices';

const FORBIDDEN_PERMISSIONS = new Set([
  'inventory_management',
  'product_management',
  'analytics',
  'upload_invoices',
  'update_inventory',
  'manage_products',
  'view_analytics'
]);

export type VendorContext =
  | {
      ok: true;
      vendorId: string;
      email?: string;
      permissions: string[];
      vendor: any;
    }
  | { ok: false; response: Response };

export async function requireVendor(
  request: Request,
  required?: Permission | Permission[]
): Promise<VendorContext> {
  const { session, status } = await readSession(request);
  if (!session?.user) {
    return { ok: false, response: unauthorizedJson(undefined, { status }) };
  }

  const vendor = await getVendorById(session.user.id);
  if (!vendor) {
    return {
      ok: false,
      response: jsonResponse({ message: 'Vendor not found' }, { status: 404 }, { noIndex: true })
    };
  }

  const portalAccess = (vendor as any).portalAccess || {};
  const enabled = Boolean(portalAccess.enabled);
  if (!enabled) {
    return {
      ok: false,
      response: jsonResponse({ message: 'Portal access disabled' }, { status: 403 }, { noIndex: true })
    };
  }

  const permsRaw = portalAccess.permissions || [];
  const permissions = Array.isArray(permsRaw)
    ? permsRaw.map((p: any) => String(p || '').toLowerCase())
    : [];

  if (permissions.some((permission) => FORBIDDEN_PERMISSIONS.has(permission))) {
    return {
      ok: false,
      response: jsonResponse(
        { message: 'Forbidden vendor permissions detected' },
        { status: 403 },
        { noIndex: true }
      )
    };
  }

  if (required) {
    const requiredList = Array.isArray(required) ? required : [required];
    const missing = requiredList.some((perm) => !permissions.includes(perm));
    if (missing) {
      return {
        ok: false,
        response: jsonResponse({ message: 'Insufficient permissions' }, { status: 403 }, { noIndex: true })
      };
    }
  }

  return {
    ok: true,
    vendorId: vendor._id,
    email:
      portalAccess.email ||
      (vendor as any)?.primaryContact?.email ||
      (vendor as any)?.accountingContact?.email ||
      '',
    permissions,
    vendor
  };
}
