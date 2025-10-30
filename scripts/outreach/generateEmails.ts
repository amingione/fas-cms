import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

interface Prospect {
  company: string;
  contact?: string;
  website?: string;
  topic?: string;
}

interface OutreachConfig {
  campaignName: string;
  valueProposition: string;
  callToAction: string;
}

const TEMPLATE = `You are crafting a backlink outreach email.

Company: {company}
Contact: {contact}
Website: {website}
Topic: {topic}
Value Proposition: {valueProposition}
Call To Action: {callToAction}

Write a concise email (<= 160 words) that feels personal, highlights mutual value, and links to https://www.fasmotorsports.com/blog.
`;

const readProspects = async () => {
  const file = path.join('scripts', 'outreach', 'prospects.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Prospect[]) : [];
  } catch {
    return [];
  }
};

export async function generateOutreachEmails(config: OutreachConfig, prospects?: Prospect[]) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const openai = new OpenAI({ apiKey });
  const list = prospects ?? (await readProspects());

  if (!list.length) {
    throw new Error('No outreach prospects supplied.');
  }

  const outputs: Array<{ prospect: Prospect; email: string }> = [];

  for (const prospect of list) {
    const prompt = TEMPLATE.replace('{company}', prospect.company ?? 'Partner')
      .replace('{contact}', prospect.contact ?? 'there')
      .replace('{website}', prospect.website ?? 'N/A')
      .replace('{topic}', prospect.topic ?? 'automotive performance')
      .replace('{valueProposition}', config.valueProposition)
      .replace('{callToAction}', config.callToAction);

    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
      temperature: 0.7
    });

    const email = response.output_text ?? 'Unable to generate email content.';
    outputs.push({ prospect, email });
  }

  const outDir = path.join('tmp', 'outreach');
  await fs.mkdir(outDir, { recursive: true });

  const outputPath = path.join(outDir, `${config.campaignName.replace(/\s+/g, '-').toLowerCase()}-emails.json`);
  await fs.writeFile(outputPath, JSON.stringify(outputs, null, 2), 'utf8');

  console.info(`[outreach] Generated ${outputs.length} outreach email drafts at ${outputPath}`);
  return outputs;
}

async function runFromCli() {
  const prospects = await readProspects();
  const campaign: OutreachConfig = {
    campaignName: process.argv[2] || 'backlink-campaign',
    valueProposition:
      process.argv[3] ||
      'F.A.S. Motorsports shares advanced performance tuning guides your readers will love.',
    callToAction: process.argv[4] || 'Let us collaborate on a co-branded tech article next week.'
  };

  await generateOutreachEmails(campaign, prospects);
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entrypoint === fileURLToPath(import.meta.url)) {
  runFromCli().catch((error) => {
    console.error('[generateOutreachEmails] Unhandled error', error);
    process.exitCode = 1;
  });
}
