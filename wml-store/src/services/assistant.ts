import { storeConfig } from '@/config/store';

export type AssistantProductRecommendation = {
  id: string;
  name: string;
  linkText: string;
  imageUrl: string;
  price: number | null;
  listPrice: number | null;
};

export type AssistantChatResponse = {
  message: string;
  products: AssistantProductRecommendation[];
};

export type AssistantHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

type AssistantCurrentProduct = {
  id?: string;
  name?: string;
  category?: string;
};

type AssistantRequest = {
  message: string;
  history?: AssistantHistoryItem[];
  currentProduct?: AssistantCurrentProduct;
};

type AssistantImageRequest = {
  imageDataUrl: string;
};

function normalizeProduct(value: unknown): AssistantProductRecommendation | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const id = String(item.id || '').trim();
  const name = String(item.name || '').trim();
  if (!id || !name) return null;

  const numericValue = (candidate: unknown) => typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
  return {
    id,
    name,
    linkText: String(item.linkText || '').trim(),
    imageUrl: String(item.imageUrl || '').trim(),
    price: numericValue(item.price),
    listPrice: numericValue(item.listPrice),
  };
}

function normalizeResponse(value: unknown): AssistantChatResponse {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const products = Array.isArray(payload.products)
    ? payload.products.flatMap((product) => {
      const normalized = normalizeProduct(product);
      return normalized ? [normalized] : [];
    })
    : [];

  return {
    message: String(payload.message || 'Não consegui responder agora. Tente novamente em instantes.').trim(),
    products,
  };
}

export async function sendAssistantMessage(
  message: string,
  history: AssistantHistoryItem[] = [],
  currentProduct?: AssistantCurrentProduct,
): Promise<AssistantChatResponse> {
  const body: AssistantRequest = {
    message: message.trim(),
    history: history.slice(-8),
    currentProduct,
  };
  const response = await fetch(`${storeConfig.backendUrl}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messageFromServer = payload && typeof payload.message === 'string' ? payload.message : '';
    throw new Error(messageFromServer || `Não foi possível falar com o assistente (HTTP ${response.status}).`);
  }
  return normalizeResponse(payload);
}

export async function analyzeAssistantImage(imageDataUrl: string): Promise<AssistantChatResponse> {
  const body: AssistantImageRequest = { imageDataUrl };
  const response = await fetch(`${storeConfig.backendUrl}/assistant/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messageFromServer = payload && typeof payload.message === 'string'
      ? payload.message
      : typeof payload.error === 'string' ? payload.error : '';
    throw new Error(messageFromServer || `Não foi possível analisar a imagem (HTTP ${response.status}).`);
  }
  return normalizeResponse(payload);
}

