import { cartAddSchema } from '@/lib/validators/api-requests';
import { sanityProductSchema } from '@/lib/validators/sanity';

export async function POST({ request }: { request: Request }) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Invalid content type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const bodyResult = cartAddSchema.safeParse(body);
  if (!bodyResult.success) {
    console.error('[validation-failure]', {
      schema: 'cartAddSchema',
      context: 'api/cart',
      identifier: 'unknown',
      timestamp: new Date().toISOString(),
      errors: bodyResult.error.format()
    });
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: bodyResult.error.format() }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { productId, quantity, sessionId } = bodyResult.data;

  // Verify the referenced document is a product
  const validateRes = await fetch(
    `https://${import.meta.env.PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v1/data/query/${import.meta.env.PUBLIC_SANITY_DATASET}?query=*[_id == "${productId}"][0]{_type}`,
    {
      headers: {
        Authorization: `Bearer ${import.meta.env.SANITY_API_TOKEN}`
      }
    }
  );

  if (!validateRes.ok) {
    return new Response(JSON.stringify({ error: 'Failed to validate product with Sanity' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { result: productCheck } = await validateRes.json();
  const productCheckResult = sanityProductSchema.partial().safeParse(productCheck);
  if (!productCheckResult.success) {
    console.warn('[sanity-validation]', {
      _id: (productCheck as any)?._id,
      _type: 'product',
      errors: productCheckResult.error.format()
    });
    return new Response(JSON.stringify({ error: 'Invalid product reference' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!productCheckResult.data || productCheckResult.data._type !== 'product') {
    return new Response(JSON.stringify({ error: 'Invalid product reference' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const res = await fetch(
    `https://${import.meta.env.PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/${import.meta.env.SANITY_API_VERSION}/data/mutate/${import.meta.env.PUBLIC_SANITY_DATASET}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.SANITY_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mutations: [
          {
            create: {
              _type: 'cartItem',
              product: { _type: 'reference', _ref: productId },
              quantity,
              sessionId,
              addedAt: new Date().toISOString()
            }
          }
        ]
      })
    }
  );

  const result = await res.json();
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
