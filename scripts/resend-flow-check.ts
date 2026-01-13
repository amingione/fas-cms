#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractResendMessageId } from '../src/lib/resend';

type FlowCase = {
  label: string;
  payload?: unknown;
};

const parseArgs = (): Record<string, string> => {
  const entries: Record<string, string> = {};
  for (const raw of process.argv.slice(2)) {
    if (!raw.startsWith('--')) continue;
    const [key, ...rest] = raw.split('=');
    entries[key] = rest.join('=') || 'true';
  }
  return entries;
};

const loadJsonFromFile = (pathOrUndefined?: string): unknown | null => {
  if (!pathOrUndefined) return null;
  const absolute = pathOrUndefined.startsWith('/')
    ? pathOrUndefined
    : resolve(process.cwd(), pathOrUndefined);
  if (!existsSync(absolute)) {
    console.warn(`Unable to read JSON at ${absolute}; file does not exist.`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(absolute, 'utf-8'));
  } catch (error) {
    console.warn(`Unable to parse JSON file at ${absolute}:`, (error as Error).message);
    return null;
  }
};

const reportFlow = ({ label, payload }: FlowCase) => {
  const snapshot = payload ? JSON.stringify(payload) : 'empty payload';
  const messageId = extractResendMessageId(payload);
  console.log(`\n[${label}] snapshot: ${snapshot}`);
  if (messageId) {
    console.log(`[${label}] message id detected: ${messageId}`);
  } else {
    console.warn(`[${label}] Resend response missing id → the logging change now records this warning.`);
  }
};

const runBuildQuoteSimulation = (vehicleName: string, extraResponsePath?: string) => {
  const vehicle = vehicleName.trim();
  const safeVehicle = vehicle || '';
  const quoteSubject = safeVehicle ? `Build Quote Request — ${safeVehicle}` : 'Build Quote Request';

  console.log('--- Build Quote Simulation ---');
  console.log('Vehicle provided:', vehicle || '(none)');
  console.log('Computed email subject:', quoteSubject);

  const simulatedResponses: FlowCase[] = [
    {
      label: 'build-quote / success',
      payload: { id: 'build-quote-msg', status: 'queued' }
    },
    {
      label: 'build-quote / missing id',
      payload: { status: 'queued' }
    }
  ];

  const external = loadJsonFromFile(extraResponsePath);
  if (external) {
    simulatedResponses.push({
      label: 'build-quote / external sample',
      payload: external
    });
  }

  simulatedResponses.forEach(reportFlow);
};

const runOrderFlowSimulation = (orderNumber: string, customerResponsePath?: string, internalResponsePath?: string) => {
  console.log('\n--- Order Flow Simulation ---');
  console.log('Order number:', orderNumber);

  const flowCases: FlowCase[] = [
    { label: 'order confirmation / success', payload: { id: 'order-confirm-msg' } },
    { label: 'order confirmation / missing id', payload: { result: 'ok' } },
    { label: 'internal notification / success', payload: { id: 'internal-msg' } },
    { label: 'internal notification / missing id', payload: {} }
  ];

  const customerSample = loadJsonFromFile(customerResponsePath);
  if (customerSample) {
    flowCases.push({ label: 'order confirmation / external', payload: customerSample });
  }

  const internalSample = loadJsonFromFile(internalResponsePath);
  if (internalSample) {
    flowCases.push({ label: 'internal notification / external', payload: internalSample });
  }

  flowCases.forEach(reportFlow);
};

const main = () => {
  const args = parseArgs();
  const vehicleArg = args['--vehicle'] ?? 'F80 M3';
  const orderArg = args['--order-number'] ?? `FAS-TEST-${Date.now()}`;

  const buildResponseFile = args['--build-response'] ?? process.env.BUILD_RESPONSE_PATH;
  const orderResponseFile = args['--order-response'] ?? process.env.ORDER_RESPONSE_PATH;
  const internalResponseFile = args['--internal-response'] ?? process.env.INTERNAL_RESPONSE_PATH;

  runBuildQuoteSimulation(vehicleArg, buildResponseFile);
  runOrderFlowSimulation(orderArg, orderResponseFile, internalResponseFile);

  console.log('\nSimulation complete. To exercise these flows against a running server:')
  console.log('- Run `yarn dev` (or Netlify/Astro dev server).');
  console.log('- Submit a build quote via `/api/build-quote` and confirm the server logs the Resend response IDs.');
  console.log('- Trigger the order webhook in a controlled test environment so the new email logging branch runs.');
  console.log('Supply `--build-response=path`, `--order-response=path`, or `--internal-response=path` to replay recorded Resend responses.');
};

main();
