// src/pages/api/hello.ts
export async function GET() {
  return new Response(JSON.stringify({ message: 'Hello from Netlify!' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
