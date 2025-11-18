import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { google, type youtube_v3 } from 'googleapis';
import { sanityFetch } from '../../src/lib/sanityFetch';

interface ProductVideoDoc {
  slug?: { current?: string };
  title?: string;
  youtubeVideos?: Array<{ videoId?: string; captionOverride?: string }>;
}

const OUTPUT_DIR = path.join('tmp', 'video');

async function fetchProductsWithVideos() {
  const data = await sanityFetch<{ products: ProductVideoDoc[] }>({
    query: `{
  "products": *[_type == "product" && !(_id in path('drafts.**')) && (status == "active" || !defined(status)) && coalesce(productType, "") != "service" && count(youtubeVideos[]) > 0]{
    title,
    slug,
    youtubeVideos[]{ videoId, captionOverride }
  }
}`
  });

  return Array.isArray(data?.products) ? data.products : [];
}

const toEmbed = (videoId: string) =>
  `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

async function fetchVideoMetadata(videoIds: string[]) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !videoIds.length) return {} as Record<string, any>;

  const youtube = google.youtube({
    version: 'v3',
    auth: apiKey
  });
  const params: youtube_v3.Params$Resource$Videos$List = {
    id: videoIds,
    part: ['snippet', 'contentDetails']
  };

  const { data } = await youtube.videos.list(params);

  const map: Record<string, any> = {};
  for (const item of data.items ?? []) {
    if (!item.id) continue;
    map[item.id] = {
      title: item.snippet?.title,
      description: item.snippet?.description,
      publishedAt: item.snippet?.publishedAt
    };
  }
  return map;
}

export async function processProductVideos() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const products = await fetchProductsWithVideos();

  const allVideoIds = products
    .flatMap((product) => product.youtubeVideos ?? [])
    .map((entry) => entry.videoId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const metadata = await fetchVideoMetadata(allVideoIds);

  for (const product of products) {
    const slug = product.slug?.current;
    if (!slug || !product.youtubeVideos?.length) continue;

    const videos = product.youtubeVideos
      .filter((entry): entry is { videoId: string; captionOverride?: string } =>
        typeof entry?.videoId === 'string' && entry.videoId.length > 0
      )
      .map((entry) => {
        const videoData = metadata[entry.videoId] ?? {};
        const caption = entry.captionOverride || videoData.description || 'Captions unavailable.';
        return {
          videoId: entry.videoId,
          embedHtml: toEmbed(entry.videoId),
          caption,
          title: videoData.title ?? product.title ?? 'Product Video',
          publishedAt: videoData.publishedAt ?? null,
          productSlug: slug
        };
      });

    const outputPath = path.join(OUTPUT_DIR, `${slug.replace(/\//g, '_')}-videos.json`);
    await fs.writeFile(outputPath, JSON.stringify(videos, null, 2), 'utf8');
  }

  console.info(`[video] Processed video embeds for ${products.length} products.`);
}

async function runFromCli() {
  await processProductVideos();
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entrypoint === fileURLToPath(import.meta.url)) {
  runFromCli().catch((error) => {
    console.error('[processVideos] Unhandled error', error);
    process.exitCode = 1;
  });
}
