import { Image } from 'expo-image';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { compareSizes, isSizeVariationName } from '@/constants/sizes';
import { Spacing } from '@/constants/theme';
import type { ProductKitGroup, ProductKitItem } from '@/services/catalog';

import { ThemedText } from './themed-text';

export type KitSelection = {
  checkedProducts: Record<string, boolean>;
  selectedSizes: Record<string, string>;
};

export const emptyKitSelection = (): KitSelection => ({ checkedProducts: {}, selectedSizes: {} });

type KitSelectorProps = {
  groups: ProductKitGroup[];
  selection: KitSelection;
  onChange: (selection: KitSelection) => void;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
};

function itemSize(item: ProductKitItem) {
  return Object.entries(item.variations).find(([name]) => isSizeVariationName(name))?.[1] ?? '';
}

function sortedItems(group: ProductKitGroup) {
  const values = group.items.map((item) => ({ item, size: itemSize(item) }));
  return values.sort((left, right) => compareSizes(left.size, right.size)).map(({ item }) => item);
}

function KitCheckbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={checked ? 'Desmarcar peça do conjunto' : 'Selecionar peça do conjunto'}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
    </Pressable>
  );
}

export function KitSelector({ groups, selection, onChange, showLabel = true, style }: KitSelectorProps) {
  if (groups.length === 0) return null;

  function toggleProduct(productId: string) {
    const isChecked = Boolean(selection.checkedProducts[productId]);
    const checkedProducts = { ...selection.checkedProducts, [productId]: !isChecked };
    const selectedSizes = { ...selection.selectedSizes };
    if (isChecked) delete selectedSizes[productId];
    onChange({ checkedProducts, selectedSizes });
  }

  function selectSize(productId: string, itemId: string) {
    onChange({
      checkedProducts: { ...selection.checkedProducts, [productId]: true },
      selectedSizes: { ...selection.selectedSizes, [productId]: itemId },
    });
  }

  return (
    <View style={[styles.container, style]}>
      {showLabel && <ThemedText style={styles.label}>Selecione o tamanho das peças:</ThemedText>}
      {groups.map((group, index) => {
        const checked = Boolean(selection.checkedProducts[group.productId]);
        const selectedItemId = selection.selectedSizes[group.productId];
        const selectedItem = group.items.find((item) => item.itemId === selectedItemId);
        const showSizeWarning = checked && !selectedItem;
        const items = sortedItems(group);

        return (
          <View key={group.productId} style={styles.group}>
            <View style={styles.row}>
              <KitCheckbox checked={checked} onPress={() => toggleProduct(group.productId)} />
              {items[0]?.images[0] ? (
                <Image source={{ uri: items[0].images[0] }} style={styles.image} contentFit="cover" />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]} />
              )}
              <View style={styles.copy}>
                <ThemedText numberOfLines={2} style={styles.productName}>{group.productName}</ThemedText>
                <ThemedText style={styles.sizeLabel}>
                  Tamanho:{selectedItem ? <ThemedText style={styles.selectedSizeLabel}> {itemSize(selectedItem)}</ThemedText> : null}
                </ThemedText>
                <View style={styles.options}>
                  {items.map((item) => {
                    const size = itemSize(item) || item.itemId;
                    const selected = item.itemId === selectedItemId;
                    return (
                      <Pressable
                        key={item.itemId}
                        accessibilityLabel={`${group.productName}, tamanho ${size}`}
                        accessibilityState={{ disabled: !item.available, selected }}
                        disabled={!item.available}
                        onPress={() => selectSize(group.productId, item.itemId)}
                        style={[styles.option, selected && styles.selectedOption, !item.available && styles.unavailableOption]}>
                        <ThemedText style={[styles.optionText, selected && styles.selectedOptionText, !item.available && styles.unavailableOptionText]}>{size}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                {showSizeWarning && <ThemedText style={styles.warning}>Por favor, selecione um tamanho.</ThemedText>}
              </View>
            </View>
            {index < groups.length - 1 && <View style={styles.divider} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  label: { marginBottom: Spacing.one, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  group: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, paddingVertical: Spacing.two },
  checkbox: { width: 22, height: 22, marginTop: 1, borderRadius: 4, borderWidth: 1, borderColor: '#d6d0c8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  checkboxChecked: { borderColor: '#A49A8E', backgroundColor: '#A49A8E' },
  checkboxMark: { color: '#FFFFFF', fontSize: 15, lineHeight: 18, fontWeight: '700' },
  image: { width: 60, height: 75, borderRadius: 4, backgroundColor: '#eee8e2' },
  imagePlaceholder: { borderWidth: 1, borderColor: '#e2dcd5' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  productName: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  sizeLabel: { fontSize: 12, lineHeight: 16 },
  selectedSizeLabel: { fontWeight: '400' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingTop: 2 },
  option: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#d2c9c0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  optionText: { fontSize: 10, lineHeight: 13 },
  selectedOption: { borderColor: '#0F0805', backgroundColor: '#0F0805' },
  selectedOptionText: { color: '#FFFFFF', fontWeight: '700' },
  unavailableOption: { opacity: 0.45 },
  unavailableOptionText: { color: '#a49a8e', textDecorationLine: 'line-through' },
  warning: { marginTop: 2, color: '#C42C21', fontSize: 11, lineHeight: 15 },
  divider: { height: 1, backgroundColor: '#eee8e2' },
});
