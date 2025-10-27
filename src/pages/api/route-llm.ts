import type { APIRoute } from 'astro';
import { ROUTE_LLM_MODEL, getRouteLLMClient } from '@/lib/llm';

export const prerender = false;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function normalizeMessages(payload: any): ChatMessage[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((msg) => typeof msg?.role === 'string' && typeof msg?.content === 'string')
      .map((msg) => ({ role: msg.role, content: msg.content }));
  }
  if (typeof payload === 'string' && payload.trim().length) {
    return [{ role: 'user', content: payload.trim() }];
  }
  return [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the meaning of life?' }
  ];
}

export const POST: APIRoute = async ({ request }) => {
  const client = getRouteLLMClient();
  if (!client) {
    return new Response(JSON.stringify({ error: 'Route LLM API key is not configured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let payload: any = {};
  try {
    payload = await request.json();
  } catch {
    // ignore and fall back to defaults
  }

  const messages = normalizeMessages(payload?.messages ?? payload?.prompt);
  const stream = Boolean(payload?.stream);

  try {
    if (stream) {
      const completion = await client.chat.completions.create({
        model: ROUTE_LLM_MODEL,
        messages,
        stream: true
      });

      const encoder = new TextEncoder();
      const streamBody = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of completion) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(streamBody, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive'
        }
      });
    }

    const completion = await client.chat.completions.create({
      model: ROUTE_LLM_MODEL,
      messages,
      stream: false
    });

    return new Response(JSON.stringify(completion), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Route LLM error:', error);
    return new Response(JSON.stringify({ error: error?.message ?? 'LLM request failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
