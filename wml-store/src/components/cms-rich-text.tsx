import { useRouter } from 'expo-router';
import { type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { cmsInternalRoute, openCmsExternalLink } from '@/services/cms-links';

import { ThemedText } from './themed-text';

type DraftRange = {
  offset: number;
  length: number;
  key?: number | string;
  style?: string;
};

type DraftBlock = {
  text: string;
  type: string;
  entityRanges: DraftRange[];
  inlineStyleRanges: DraftRange[];
};

type AutoLinkRange = {
  offset: number;
  length: number;
  href: string;
};

type Segment = {
  text: string;
  href?: string;
  inlineStyle: TextStyle;
};

type CmsRichTextProps = {
  data?: Record<string, unknown>;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  textStyle?: StyleProp<TextStyle>;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function textValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function ranges(value: unknown): DraftRange[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const candidate = record(item);
    const offset = Number(candidate.offset);
    const length = Number(candidate.length);
    if (!Number.isFinite(offset) || !Number.isFinite(length) || offset < 0 || length <= 0) return [];
    return [{
      offset,
      length,
      key: typeof candidate.key === 'number' || typeof candidate.key === 'string' ? candidate.key : undefined,
      style: textValue(candidate.style),
    }];
  });
}

function parseContent(value: unknown): { blocks: DraftBlock[]; entityMap: unknown } {
  let candidate = value;
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value) as unknown;
    } catch {
      return { blocks: value.trim() ? [{ text: value, type: '', entityRanges: [], inlineStyleRanges: [] }] : [], entityMap: {} };
    }
  }

  if (Array.isArray(candidate)) {
    return {
      blocks: candidate.map((item) => {
        const block = record(item);
        return { text: textValue(block.text), type: textValue(block.type), entityRanges: ranges(block.entityRanges), inlineStyleRanges: ranges(block.inlineStyleRanges) };
      }),
      entityMap: {},
    };
  }

  const content = record(candidate);
  const blocks = Array.isArray(content.blocks)
    ? content.blocks.map((item) => {
        const block = record(item);
        return { text: textValue(block.text), type: textValue(block.type), entityRanges: ranges(block.entityRanges), inlineStyleRanges: ranges(block.inlineStyleRanges) };
      })
    : [];

  return { blocks, entityMap: content.entityMap ?? {} };
}

function entityValue(entityMap: unknown, key: number | string | undefined): Record<string, unknown> {
  if (key === undefined) return {};
  if (Array.isArray(entityMap)) return record(entityMap[Number(key)]);
  return record(record(entityMap)[String(key)]);
}

function entityHref(entityMap: unknown, key: number | string | undefined): string {
  const entity = entityValue(entityMap, key);
  const entityType = textValue(entity.type).toUpperCase();
  if (entityType && entityType !== 'LINK') return '';
  const data = record(entity.data);
  return textValue(data.href) || textValue(data.url);
}

function inlineTextStyle(activeRanges: DraftRange[]): TextStyle {
  const styles = new Set(activeRanges.map((range) => range.style?.toUpperCase()).filter(Boolean));
  return {
    ...(styles.has('BOLD') ? { fontFamily: Fonts.bold, fontWeight: '700' as const } : {}),
    ...(styles.has('ITALIC') ? { fontStyle: 'italic' as const } : {}),
    ...(styles.has('UNDERLINE') ? { textDecorationLine: 'underline' as const } : {}),
    ...(styles.has('STRIKETHROUGH') ? { textDecorationLine: 'line-through' as const } : {}),
  };
}

function autoLinkRanges(content: string): AutoLinkRange[] {
  const pattern = /(?:https?:\/\/|www\.)[^\s<]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const result: AutoLinkRange[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const trailingPunctuation = match[0].match(/[.,;:!?)}\]]+$/)?.[0] ?? '';
    const value = trailingPunctuation ? match[0].slice(0, -trailingPunctuation.length) : match[0];
    if (!value) continue;

    const href = /^www\./i.test(value)
      ? `https://${value}`
      : /@/.test(value) && !/^(?:https?:\/\/)/i.test(value)
        ? `mailto:${value}`
        : value;
    result.push({ offset: match.index, length: value.length, href });
  }

  return result;
}

function segmentsForBlock(block: DraftBlock, entityMap: unknown): Segment[] {
  const content = block.text;
  if (!content) return [];

  const automaticLinks = autoLinkRanges(content);
  const boundaries = new Set<number>([0, content.length]);
  [...block.entityRanges, ...block.inlineStyleRanges, ...automaticLinks].forEach((range) => {
    boundaries.add(Math.max(0, Math.min(content.length, range.offset)));
    boundaries.add(Math.max(0, Math.min(content.length, range.offset + range.length)));
  });

  const orderedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  const result: Segment[] = [];
  for (let index = 0; index < orderedBoundaries.length - 1; index += 1) {
    const start = orderedBoundaries[index];
    const end = orderedBoundaries[index + 1];
    if (end <= start) continue;

    const activeInlineRanges = block.inlineStyleRanges.filter((range) => start >= range.offset && start < range.offset + range.length);
    const entityRange = block.entityRanges.find((range) => start >= range.offset && start < range.offset + range.length);
    const automaticLink = automaticLinks.find((range) => start >= range.offset && start < range.offset + range.length);
    result.push({
      text: content.slice(start, end),
      href: entityHref(entityMap, entityRange?.key) || automaticLink?.href,
      inlineStyle: inlineTextStyle(activeInlineRanges),
    });
  }
  return result;
}

export function CmsRichText({ data = {}, style, titleStyle, textStyle }: CmsRichTextProps) {
  const router = useRouter();
  const title = textValue(data.title);
  const { blocks, entityMap } = parseContent(data.content);

  function openLink(value: string) {
    const route = cmsInternalRoute(value);
    if (route) {
      router.push(route as never);
      return;
    }
    void openCmsExternalLink(value);
  }

  return (
    <View style={style}>
      {!!title && <ThemedText style={[styles.title, titleStyle]}>{title}</ThemedText>}
      <View style={styles.blocks}>
        {blocks.map((block, blockIndex) => {
          const segments = segmentsForBlock(block, entityMap);
          return (
            <ThemedText key={`${block.text}-${blockIndex}`} style={[styles.block, textStyle]}>
              {segments.length > 0 ? segments.map((segment, segmentIndex) => (
                <Text
                  key={`${segment.text}-${segmentIndex}`}
                  accessibilityRole={segment.href ? 'link' : undefined}
                  onPress={segment.href ? () => openLink(segment.href as string) : undefined}
                  style={[segment.href ? styles.link : undefined, segment.inlineStyle]}>
                  {segment.text}
                </Text>
              )) : '\u00a0'}
            </ThemedText>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 22 },
  blocks: { gap: 0 },
  block: { fontFamily: Fonts.light, fontSize: 14, lineHeight: 21 },
  link: { color: '#2563eb', textDecorationLine: 'underline' },
});
