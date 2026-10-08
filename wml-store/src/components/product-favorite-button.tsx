import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { usePageTheme } from '@/context/page-theme-context';
import { useTheme } from '@/hooks/use-theme';
import { getAccountSession, subscribeAccountSession } from '@/services/auth';
import { type Product } from '@/services/catalog';
import { canSaveFavorites, getKnownFavoriteAuthState, isFavorite, subscribeFavoriteChanges, toggleFavorite } from '@/services/favorites';

import HeartIcon from './icons/HeartIcon';
import { LoginRequiredModal } from './login-required-modal';

type ProductFavoriteButtonProps = {
  product: Product;
  favorite?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
  buttonStyle?: StyleProp<ViewStyle>;
  iconSize?: number;
};

export function ProductFavoriteButton({ product, favorite: controlledFavorite, onFavoriteChange, buttonStyle, iconSize = 28 }: ProductFavoriteButtonProps) {
  const router = useRouter();
  const pageTheme = usePageTheme();
  const theme = useTheme();
  const dark = pageTheme.isDark;
  const [localFavorite, setLocalFavorite] = useState(Boolean(controlledFavorite));
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const authSyncRevision = useRef(0);
  const authState = getKnownFavoriteAuthState();
  const isSaved = authState === 'anonymous' ? false : (controlledFavorite ?? localFavorite);

  useEffect(() => {
    if (controlledFavorite !== undefined) {
      setLocalFavorite(controlledFavorite);
      return;
    }
    let active = true;
    const revision = authSyncRevision.current;
    isFavorite(product.id).then((value) => {
      if (active && revision === authSyncRevision.current) setLocalFavorite(value);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [controlledFavorite, product.id]);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeAccountSession((session) => {
      if (!active) return;
      const revision = ++authSyncRevision.current;

      if (!session?.email) {
        setLocalFavorite(false);
        onFavoriteChange?.(false);
        return;
      }

      isFavorite(product.id).then((value) => {
        if (!active || revision !== authSyncRevision.current) return;
        setLocalFavorite(value);
        if (controlledFavorite !== value) onFavoriteChange?.(value);
      }).catch(() => undefined);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [controlledFavorite, onFavoriteChange, product.id]);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeFavoriteChanges((change) => {
      getAccountSession()
        .then((session) => {
          if (!active || !session?.email || session.email.trim().toLowerCase() !== change.email) return;
          const nextFavorite = change.wishlist.includes(product.id);
          setLocalFavorite(nextFavorite);
          if (controlledFavorite !== nextFavorite) onFavoriteChange?.(nextFavorite);
        })
        .catch(() => undefined);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [controlledFavorite, onFavoriteChange, product.id]);

  function updateFavorite(value: boolean, notify = true) {
    setLocalFavorite(value);
    if (notify) onFavoriteChange?.(value);
  }

  async function changeFavorite() {
    if (favoriteLoading) return;
    const previous = isSaved;
    const authRevision = authSyncRevision.current;
    const currentAuthState = getKnownFavoriteAuthState();
    if (currentAuthState === 'anonymous') {
      setLoginModalVisible(true);
      return;
    }

    const nextFavorite = !previous;
    if (currentAuthState === 'authenticated') updateFavorite(nextFavorite);
    setFavoriteLoading(true);
    try {
      if (currentAuthState !== 'authenticated') {
        if (!(await canSaveFavorites())) {
          setLoginModalVisible(true);
          return;
        }
        updateFavorite(nextFavorite);
      }
      const result = await toggleFavorite(product, { hydrate: false });
      if (authRevision === authSyncRevision.current) updateFavorite(result.favorite);
    } catch (error) {
      updateFavorite(previous);
      Alert.alert('Favoritos', error instanceof Error ? error.message : 'Não foi possível atualizar os favoritos.');
    } finally {
      setFavoriteLoading(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityLabel={isSaved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        accessibilityRole="button"
        accessibilityState={{ selected: isSaved, disabled: favoriteLoading }}
        disabled={favoriteLoading}
        onPress={(event) => { event.stopPropagation(); void changeFavorite(); }}
        style={({ pressed }) => [styles.favoriteButton, buttonStyle, pressed && styles.pressed, favoriteLoading && styles.disabled]}
      >
        <HeartIcon size={iconSize} color={isSaved ? '#C62828' : dark ? theme.text : '#0a0a0a'} filled={isSaved} />
      </Pressable>
      <LoginRequiredModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        onLogin={() => {
          setLoginModalVisible(false);
          router.push('/account?view=access' as never);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  favoriteButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
