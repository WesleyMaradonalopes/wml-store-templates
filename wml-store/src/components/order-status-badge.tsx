import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { isCanceledOrder, orderStatusLabel } from '@/services/orders';

import { ThemedText } from './themed-text';

type OrderStatusBadgeProps = {
  status?: string | null;
  statusDescription?: string | null;
  style?: StyleProp<ViewStyle>;
};

export function OrderStatusBadge({ status, statusDescription, style }: OrderStatusBadgeProps) {
  const canceled = isCanceledOrder(status, statusDescription);

  return (
    <View style={[styles.badge, canceled ? styles.canceledBadge : styles.neutralBadge, style]}>
      <ThemedText style={[styles.text, canceled ? styles.canceledText : styles.neutralText]}>
        {orderStatusLabel(status, statusDescription)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 29,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 7,
  },
  neutralBadge: {
    backgroundColor: '#eef2f0',
    borderColor: '#e2e9e5',
  },
  canceledBadge: {
    backgroundColor: '#ffe4e2',
    borderColor: '#ffd1cd',
  },
  text: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  neutralText: {
    color: '#5f655f',
  },
  canceledText: {
    color: '#c84339',
  },
});
