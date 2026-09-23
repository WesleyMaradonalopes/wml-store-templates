import { storeConfig } from '@/config/store';

const WIDDE_API_URL = 'https://api-admin.widde.io/api/story/stories-collection/_';
const VIDEO_URL_REGEX = /\.(?:mp4|webm|mov|m4v|ogv|ogg)(?:[?#].*)?$/i;

export type WiddeStory = {
  key: string;
  previewUrl: string;
  videoUrl: string;
  thumbnailUrl: string | null;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : null;
  }

  if (!isRecord(value)) return null;

  for (const key of ['url', 'src', 'uri', 'href']) {
    const nestedUrl = asUrl(value[key]);
    if (nestedUrl) return nestedUrl;
  }

  return null;
}

function asUrlList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => asUrlList(item));
  const url = asUrl(value);
  return url ? [url] : [];
}

function isVideoUrl(url: string) {
  return VIDEO_URL_REGEX.test(url);
}

function readStoryArray(value: unknown, depth = 0): unknown[] {
  if (depth > 5 || !isRecord(value)) return [];

  for (const key of ['storiesWithLazyLoad', 'stories']) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      const nestedStories = readStoryArray(candidate, depth + 1);
      if (nestedStories.length > 0) return nestedStories;
    }
  }

  for (const key of ['data', 'storiesCollections', 'collection']) {
    const nestedStories = readStoryArray(value[key], depth + 1);
    if (nestedStories.length > 0) return nestedStories;
  }

  return [];
}

function mapStory(value: unknown, index: number): WiddeStory | null {
  if (!isRecord(value)) return null;

  const media = isRecord(value.media) ? value.media : value;
  const gifs = asUrlList(media.gifs ?? media.gif);
  const videos = asUrlList(media.videos ?? media.video);
  const previewUrl = gifs.find(isVideoUrl) || videos.find(isVideoUrl) || videos[0];

  if (!previewUrl) return null;

  const videoUrl = videos.find((url) => /\.mp4(?:[?#].*)?$/i.test(url))
    || videos.find(isVideoUrl)
    || previewUrl;
  const thumbnailUrl = asUrlList(
    media.thumbnailExposed
      ?? media.thumbnail
      ?? media.poster
      ?? value.thumbnail,
  )[0] || null;
  const storyKey = asUrl(value.key) || (typeof value.key === 'string' ? value.key : null) || (typeof value.id === 'string' ? value.id : null);

  return {
    key: storyKey || `${previewUrl}-${index}`,
    previewUrl,
    videoUrl,
    thumbnailUrl,
  };
}

export function buildWiddeProductUrl(productPath: string) {
  const trimmedPath = productPath.trim();
  const productUrl = /^https?:\/\//i.test(trimmedPath)
    ? new URL(trimmedPath)
    : new URL(`${storeConfig.widdeStoreUrl}/${trimmedPath.replace(/^\/+/, '')}`);

  if (!productUrl.pathname.endsWith('/p')) {
    productUrl.pathname = `${productUrl.pathname.replace(/\/$/, '')}/p`;
  }

  if (productUrl.protocol === 'http:') productUrl.protocol = 'https:';
  return productUrl.href;
}

export async function getWiddeStories(productPath: string, signal?: AbortSignal): Promise<WiddeStory[]> {
  if (!storeConfig.widdeEnabled || !productPath.trim()) return [];

  const widdeUrl = new URL(WIDDE_API_URL);
  widdeUrl.searchParams.set('url', buildWiddeProductUrl(productPath));
  widdeUrl.searchParams.set('loadStories', 'true');
  widdeUrl.searchParams.set('generateViewKey', 'true');
  widdeUrl.searchParams.set('collectionViewType', 'Story');
  widdeUrl.searchParams.set('webcomponent', 'widde-floating-block');
  widdeUrl.searchParams.set('pageType', 'Product');

  const response = await fetch(widdeUrl.href, {
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'ecommerce-token': storeConfig.widdeEcommerceToken,
      Referer: 'mobile',
    },
  });

  if (!response.ok) throw new Error(`Widde request failed with status ${response.status}`);

  const payload = await response.json() as unknown;
  const stories = readStoryArray(payload);
  const mappedStories = stories
    .map((story, index) => mapStory(story, index))
    .filter((story): story is WiddeStory => Boolean(story));

  return mappedStories.filter((story, index, list) => list.findIndex((item) => item.key === story.key) === index);
}
