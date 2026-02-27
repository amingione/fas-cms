import { readSession } from '@/server/auth/session';
import { getAnyVendor, getVendorByEmail, getVendorById } from '@/server/sanity-client';
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

const DEFAULT_VENDOR_PERMISSIONS: Permission[] = [
  'view_own_orders',
  'create_wholesale_orders',
  'view_own_quotes',
  'view_wholesale_catalog',
  'send_support_messages',
  'view_payments',
  'view_analytics',
  'upload_invoices'
];

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

  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');
  const requestHost = String(forwardedHost || hostHeader || '')
    .trim()
    .toLowerCase()
    .split(':')[0];
  const isLocalhostHost =
    requestHost === 'localhost' ||
    requestHost.endsWith('.localhost') ||
    requestHost === '127.0.0.1' ||
    requestHost === '::1';
  const allowLocalForceAdmin =
    process.env.LOCALHOST_FORCE_ADMIN_LOGIN?.trim().toLowerCase() === 'true' && isLocalhostHost;
  const sessionRoles = Array.isArray(session.user.roles) ? session.user.roles : [];
  const isAdminSession = sessionRoles.some((role) =>
    ['admin', 'staff', 'manager'].includes(String(role || '').toLowerCase())
  );

  let vendor = await getVendorById(session.user.id);
  if (!vendor && session.user.email) {
    vendor = await getVendorByEmail(session.user.email);
  }
  if (!vendor && allowLocalForceAdmin && isAdminSession) {
    const forcedVendorId = String(process.env.LOCALHOST_FORCE_VENDOR_ID || '')
      .trim()
      .replace(/^drafts\./, '');
    if (forcedVendorId) {
      vendor = await getVendorById(forcedVendorId);
    }
    if (!vendor) {
      vendor = await getVendorByEmail(session.user.email || '');
    }
    if (!vendor) {
      vendor = await getAnyVendor();
    }
  }

  if (!vendor) {
    return {
      ok: false,
      response: jsonResponse({ message: 'Vendor not found' }, { status: 404 }, { noIndex: true })
    };
  }

  const vendorAny = vendor as any;
  const portalAccess = vendorAny.portalAccess || {};
  const enabled =
    portalAccess.enabled === true ||
    vendorAny.portalEnabled === true ||
    Boolean(portalAccess.setupCompletedAt) ||
    Boolean(portalAccess.passwordHash) ||
    Boolean(vendorAny.passwordHash);
  if (!enabled) {
    return {
      ok: false,
      response: jsonResponse({ message: 'Portal access disabled' }, { status: 403 }, { noIndex: true })
    };
  }

  const permsRaw = portalAccess.permissions || [];
  const permissions = (Array.isArray(permsRaw) && permsRaw.length > 0
    ? permsRaw.map((p: any) => String(p || '').toLowerCase())
    : DEFAULT_VENDOR_PERMISSIONS) as string[];

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
      vendorAny?.primaryContact?.email ||
      vendorAny?.accountingContact?.email ||
      vendorAny?.email ||
      (Array.isArray(vendorAny?.portalUsers) ? vendorAny.portalUsers[0]?.email : '') ||
      '',
    permissions,
    vendor
  };
}
