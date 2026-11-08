import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { useTheme } from '@/hooks/use-theme';
import { openCmsExternalLink } from '@/services/cms-links';
import {
  calculateDistanceInKm,
  formatDistance,
  getAddressLines,
  getCoordinates,
  getHoursDisplay,
  getMapEmbedUrl,
  getMapsUrl,
  getStoreCity,
  getStoreName,
  getStoreSearchText,
  getStoreState,
  getWhatsAppUrl,
  type Store,
  type StoreCoordinates,
} from '@/services/stores';
import { Spacing } from '@/constants/theme';

import ChevronRightIcon from './icons/ChevronRightIcon';
import StoreIcon from './icons/StoreIcon';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type StoreWithDistance = Store & {
  normalizedId: string;
  distanceKm?: number;
};

type StoreLocatorProps = {
  stores: Store[];
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  title?: string;
  subtitle?: string;
};

type LocationStatus = 'idle' | 'loading' | 'success' | 'error';

const DEFAULT_SUBTITLE = 'Encontre a loja Hope Resort mais próxima de você.';

function normalizeText(value: unknown) {
  return String(value || '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function sortText(first: string, second: string) {
  return first.localeCompare(second, 'pt-BR');
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort(sortText);
}

export function StoreLocator({ stores, onScroll, title = 'Nossas lojas', subtitle = DEFAULT_SUBTITLE }: StoreLocatorProps) {
  const theme = useTheme();
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeBrands, setActiveBrands] = useState<string[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
    () => stores[0]?.id || null,
  );
  const [userCoordinates, setUserCoordinates] = useState<StoreCoordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationError, setLocationError] = useState('');

  const normalizedStores = useMemo<StoreWithDistance[]>(
    () => stores.map((store, index) => ({
      ...store,
      normalizedId: String(store.id || `store-${index}`),
    })),
    [stores],
  );

  const availableStates = useMemo(
    () => uniqueSorted(normalizedStores.map(getStoreState)),
    [normalizedStores],
  );

  const availableCities = useMemo(
    () => uniqueSorted(
      normalizedStores
        .filter((store) => !stateFilter || getStoreState(store) === stateFilter)
        .map(getStoreCity),
    ),
    [normalizedStores, stateFilter],
  );

  const availableBrands = useMemo(
    () => uniqueSorted(normalizedStores.map((store) => store.brand || '')),
    [normalizedStores],
  );

  const filteredStores = useMemo(() => {
    const normalizedSearchTerm = normalizeText(searchTerm).trim();

    return normalizedStores.filter((store) => {
      const matchesState = !stateFilter || getStoreState(store) === stateFilter;
      const matchesCity = !cityFilter || getStoreCity(store) === cityFilter;
      const matchesSearch = !normalizedSearchTerm || getStoreSearchText(store).includes(normalizedSearchTerm);
      const matchesBrand = !activeBrands.length || (store.brand && activeBrands.includes(store.brand));
      return matchesState && matchesCity && matchesSearch && matchesBrand;
    });
  }, [activeBrands, cityFilter, normalizedStores, searchTerm, stateFilter]);

  const sortedStores = useMemo<StoreWithDistance[]>(() => {
    const storesWithDistance = filteredStores.map((store) => {
      const storeCoordinates = getCoordinates(store);
      const distanceKm = userCoordinates && storeCoordinates
        ? calculateDistanceInKm(userCoordinates, storeCoordinates)
        : undefined;
      return { ...store, distanceKm };
    });

    if (!userCoordinates) return storesWithDistance;

    return storesWithDistance.sort((firstStore, secondStore) => {
      if (typeof firstStore.distanceKm !== 'number') return 1;
      if (typeof secondStore.distanceKm !== 'number') return -1;
      return firstStore.distanceKm - secondStore.distanceKm;
    });
  }, [filteredStores, userCoordinates]);

  const displayedStores = useMemo(() => {
    if (!selectedStoreId) return sortedStores;
    const selectedIndex = sortedStores.findIndex((store) => store.normalizedId === selectedStoreId);
    if (selectedIndex <= 0) return sortedStores;
    return [
      sortedStores[selectedIndex],
      ...sortedStores.slice(0, selectedIndex),
      ...sortedStores.slice(selectedIndex + 1),
    ];
  }, [selectedStoreId, sortedStores]);

  const selectedStore = sortedStores.find((store) => store.normalizedId === selectedStoreId) || null;

  useEffect(() => {
    if (!sortedStores.some((store) => store.normalizedId === selectedStoreId)) {
      setSelectedStoreId(sortedStores[0]?.normalizedId || null);
    }
  }, [selectedStoreId, sortedStores]);

  useEffect(() => {
    if (cityFilter && !availableCities.includes(cityFilter)) setCityFilter('');
  }, [availableCities, cityFilter]);

  useEffect(() => {
    const availableBrandSet = new Set(availableBrands);
    setActiveBrands((current) => current.filter((brand) => availableBrandSet.has(brand)));
  }, [availableBrands]);

  async function requestUserLocation() {
    if (locationStatus === 'loading') return;

    setLocationStatus('loading');
    setLocationError('');

    try {
      const Location = await import('expo-location');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationStatus('error');
        setLocationError('Permita o acesso à localização para encontrar as lojas mais próximas.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationStatus('success');
    } catch {
      setLocationStatus('error');
      setLocationError('A localização não está disponível nesta versão do aplicativo. Atualize ou reinstale o app e tente novamente.');
    }
  }

  function handleStateChange(value: string) {
    setStateFilter(value);
    setCityFilter('');
  }

  function toggleBrand(brand: string) {
    setActiveBrands((current) => current.includes(brand)
      ? current.filter((item) => item !== brand)
      : [...current, brand]);
  }

  function selectStore(storeId: string) {
    setSelectedStoreId(storeId);
  }

  return (
    <ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText style={styles.eyebrow}>ENCONTRE UMA LOJA</ThemedText>
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
        {!!subtitle && <ThemedText themeColor="textSecondary" style={styles.subtitle}>{subtitle}</ThemedText>}
      </View>

      <View style={styles.summary}>
        <ThemedText style={styles.summaryPrimary}>
          {filteredStores.length} {filteredStores.length === 1 ? 'loja encontrada' : 'lojas encontradas'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.summarySecondary}>Total de lojas: {normalizedStores.length}</ThemedText>
      </View>

      <ThemedView style={[styles.filtersCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <View style={styles.filterRow}>
          <FilterPicker
            label="Estado"
            placeholder="Selecione"
            value={stateFilter}
            options={availableStates}
            onChange={handleStateChange}
          />
          <FilterPicker
            label="Cidade"
            placeholder="Selecione"
            value={cityFilter}
            options={availableCities}
            disabled={!availableCities.length}
            onChange={setCityFilter}
          />
        </View>

        <View style={styles.searchField}>
          <ThemedText style={styles.fieldLabel}>Buscar loja</ThemedText>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Nome, cidade ou endereço"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text, borderColor: theme.border }]}
            accessibilityLabel="Buscar loja por nome, cidade ou endereço"
          />
        </View>

        <View style={styles.locationBlock}>
          <ThemedText themeColor="textSecondary" style={styles.helperText}>Ou encontre lojas próximas a você</ThemedText>
          <Pressable
            accessibilityRole="button"
            disabled={locationStatus === 'loading'}
            onPress={() => { void requestUserLocation(); }}
            style={[styles.locationButton, { borderColor: theme.text }, locationStatus === 'loading' && styles.disabled]}>
            {locationStatus === 'loading' ? <ActivityIndicator size="small" color={theme.text} /> : <ThemedText style={styles.locationGlyph}>⌖</ThemedText>}
            <ThemedText style={styles.locationButtonText}>
              {locationStatus === 'loading' ? 'Buscando sua localização...' : 'Usar a minha localização'}
            </ThemedText>
          </Pressable>
          {locationStatus === 'success' && <ThemedText themeColor="textSecondary" style={styles.locationSuccess}>Lojas ordenadas pela distância aproximada.</ThemedText>}
          {!!locationError && <ThemedText style={styles.locationError}>{locationError}</ThemedText>}
        </View>

        {!!availableBrands.length && (
          <View style={styles.brandFilters}>
            <ThemedText style={styles.fieldLabel}>Filtre por marca</ThemedText>
            <View style={styles.brandOptions}>
              {availableBrands.map((brand) => {
                const active = activeBrands.includes(brand);
                return (
                  <Pressable
                    key={brand}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    onPress={() => toggleBrand(brand)}
                    style={styles.brandOption}>
                    <View style={[styles.checkbox, active && { backgroundColor: theme.text, borderColor: theme.text }]}>
                      {active && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
                    </View>
                    <ThemedText>{brand}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ThemedView>

      <View style={styles.storeList}>
        {displayedStores.length ? displayedStores.map((store) => (
          <StoreCard
            key={store.normalizedId}
            store={store}
            selected={store.normalizedId === selectedStoreId}
            onPress={() => selectStore(store.normalizedId)}
          />
        )) : (
          <EmptyState hasStores={normalizedStores.length > 0} />
        )}
      </View>

      <StoreMap store={selectedStore} />
      {selectedStore && <StoreDetails store={selectedStore} />}
    </ScrollView>
  );
}

function FilterPicker({ label, placeholder, value, options, disabled = false, onChange }: {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (disabled) setVisible(false);
  }, [disabled]);

  return (
    <View style={styles.filterField}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setVisible(true)}
        style={[styles.filterButton, { borderColor: theme.border, backgroundColor: theme.background }, disabled && styles.disabled]}>
        <ThemedText numberOfLines={1} themeColor={value ? 'text' : 'textSecondary'} style={styles.filterButtonText}>{value || placeholder}</ThemedText>
        <ChevronRightIcon color={theme.textSecondary} size={15} />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setVisible(false)}>
          <Pressable style={[styles.pickerSheet, { backgroundColor: theme.surface }]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <ThemedText style={styles.pickerTitle}>{label}</ThemedText>
              <Pressable accessibilityLabel={`Fechar seleção de ${label}`} onPress={() => setVisible(false)}><ThemedText style={styles.pickerClose}>Fechar</ThemedText></Pressable>
            </View>
            <ScrollView style={styles.pickerOptions}>
              {[{ label: placeholder, value: '' }, ...options.map((option) => ({ label: option, value: option }))].map((option) => (
                <Pressable
                  key={option.value || 'empty'}
                  onPress={() => { onChange(option.value); setVisible(false); }}
                  style={[styles.pickerOption, option.value === value && { backgroundColor: theme.background }]}>
                  <ThemedText style={option.value === value && styles.pickerOptionSelected}>{option.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function StoreCard({ store, selected, onPress }: { store: StoreWithDistance; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const addressLines = getAddressLines(store);
  const whatsappUrl = getWhatsAppUrl(store.whatsapp || store.whatsappLink);
  const distance = formatDistance(store.distanceKm);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.storeCard, { borderColor: selected ? theme.text : theme.border, backgroundColor: theme.surface }, selected && styles.storeCardSelected]}>
      <View style={styles.storeCardHeader}>
        <View style={styles.storeCardTitle}>
          <StoreIcon color={theme.text} size={19} />
          <ThemedText style={styles.storeName}>{getStoreName(store)}</ThemedText>
        </View>
        <ChevronRightIcon color={theme.text} size={16} />
      </View>
      {!!addressLines.primaryLine && <ThemedText themeColor="textSecondary" style={styles.addressLine}>{addressLines.primaryLine}</ThemedText>}
      {!!addressLines.secondaryLine && <ThemedText themeColor="textSecondary" style={styles.addressLine}>{addressLines.secondaryLine}</ThemedText>}
      {!!store.phone && <ThemedText themeColor="textSecondary" style={styles.contactLine}>{store.phone}</ThemedText>}
      {!!distance && <ThemedText themeColor="textSecondary" style={styles.distanceLine}>{distance} de distância</ThemedText>}
      <View style={styles.cardActions}>
        {!!whatsappUrl && <Pressable onPress={() => { void openCmsExternalLink(whatsappUrl); }}><ThemedText style={styles.whatsappAction}>WhatsApp</ThemedText></Pressable>}
        <Pressable onPress={() => { void openCmsExternalLink(getMapsUrl(store)); }} style={styles.mapAction}><ThemedText style={styles.mapActionText}>Como chegar</ThemedText><ChevronRightIcon color={theme.text} size={14} /></Pressable>
      </View>
    </Pressable>
  );
}

function EmptyState({ hasStores }: { hasStores: boolean }) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.emptyState, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <StoreIcon color={theme.textSecondary} size={28} />
      <ThemedText style={styles.emptyTitle}>{hasStores ? 'Nenhuma loja encontrada' : 'Nenhuma loja cadastrada'}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.emptyDescription}>
        {hasStores ? 'Tente alterar os filtros ou buscar por outro termo.' : 'As lojas aparecerão aqui assim que forem configuradas no Headless CMS.'}
      </ThemedText>
    </ThemedView>
  );
}

function StoreMap({ store }: { store: StoreWithDistance | null }) {
  const theme = useTheme();
  const mapUrl = getMapEmbedUrl(store);

  return (
    <ThemedView style={[styles.mapCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.mapHeader}>
        <ThemedText style={styles.sectionTitle}>Mapa das lojas</ThemedText>
        {store && <ThemedText themeColor="textSecondary" numberOfLines={1} style={styles.mapStoreName}>{getStoreName(store)}</ThemedText>}
      </View>
      {store ? (
        Platform.OS === 'web' ? (
          <Pressable onPress={() => { void openCmsExternalLink(getMapsUrl(store)); }} style={[styles.mapFallback, { backgroundColor: theme.background }]}>
            <StoreIcon color={theme.text} size={28} />
            <ThemedText style={styles.mapFallbackTitle}>Abrir mapa da loja</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.mapFallbackText}>Toque para ver a localização no Google Maps.</ThemedText>
          </Pressable>
        ) : (
          <WebView
            source={{ uri: mapUrl }}
            startInLoadingState
            originWhitelist={['https://*', 'http://*']}
            style={styles.map}
          />
        )
      ) : (
        <View style={[styles.mapFallback, { backgroundColor: theme.background }]}>
          <StoreIcon color={theme.textSecondary} size={28} />
          <ThemedText style={styles.mapFallbackTitle}>Mapa das lojas</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.mapFallbackText}>Selecione uma loja para visualizar sua localização.</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

function StoreDetails({ store }: { store: StoreWithDistance }) {
  const theme = useTheme();
  const addressLines = getAddressLines(store);
  const hours = getHoursDisplay(store.hours);
  const whatsappUrl = getWhatsAppUrl(store.whatsapp || store.whatsappLink);

  async function openPhone() {
    if (!store.phone) return;
    try {
      await Linking.openURL(`tel:${store.phone}`);
    } catch {
      // No handler is available on this device.
    }
  }

  return (
    <ThemedView style={[styles.detailsCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <ThemedText style={styles.eyebrow}>LOJA SELECIONADA</ThemedText>
      <ThemedText style={styles.detailsTitle}>{getStoreName(store)}</ThemedText>
      {!!store.brand && <ThemedText themeColor="textSecondary" style={styles.detailsBrand}>{store.brand}</ThemedText>}

      <View style={styles.detailGroup}>
        <ThemedText style={styles.detailLabel}>Endereço</ThemedText>
        {!!addressLines.primaryLine && <ThemedText themeColor="textSecondary">{addressLines.primaryLine}</ThemedText>}
        {!!addressLines.secondaryLine && <ThemedText themeColor="textSecondary">{addressLines.secondaryLine}</ThemedText>}
      </View>

      {(store.phone || whatsappUrl) && (
        <View style={styles.detailGroup}>
          <ThemedText style={styles.detailLabel}>Contato</ThemedText>
          {!!store.phone && <Pressable onPress={() => { void openPhone(); }}><ThemedText style={styles.detailLink}>{store.phone}</ThemedText></Pressable>}
          {!!whatsappUrl && <Pressable onPress={() => { void openCmsExternalLink(whatsappUrl); }}><ThemedText style={styles.detailLink}>Falar pelo WhatsApp</ThemedText></Pressable>}
        </View>
      )}

      {!!hours.rows.length && (
        <View style={styles.detailGroup}>
          <ThemedText style={styles.detailLabel}>Horário de funcionamento</ThemedText>
          <View style={[styles.hoursList, hours.layout === 'inline' && styles.hoursListInline]}>
            {hours.rows.map((row) => (
              <View key={row.key} style={styles.hoursRow}>
                {!!row.label && <ThemedText themeColor="textSecondary" style={styles.hoursLabel}>{row.label}</ThemedText>}
                <ThemedText themeColor="textSecondary" style={styles.hoursValue}>{row.value}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable onPress={() => { void openCmsExternalLink(getMapsUrl(store)); }} style={[styles.primaryAction, { backgroundColor: theme.text }]}>
        <ThemedText style={[styles.primaryActionText, { color: theme.background }]}>Abrir rota no mapa</ThemedText>
        <ChevronRightIcon color={theme.background} size={16} />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingBottom: 96 },
  header: { gap: 6, paddingTop: 8 },
  eyebrow: { fontSize: 11, lineHeight: 16, letterSpacing: 1.5, fontWeight: '700' },
  title: { fontSize: 30, lineHeight: 38 },
  subtitle: { fontSize: 14, lineHeight: 21 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  summaryPrimary: { fontSize: 13, fontWeight: '700' },
  summarySecondary: { fontSize: 12 },
  filtersCard: { gap: 16, padding: 14, borderRadius: 16, borderWidth: 1 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterField: { flex: 1, gap: 6, minWidth: 0 },
  fieldLabel: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  filterButton: { minHeight: 44, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  filterButtonText: { flex: 1, fontSize: 12 },
  searchField: { gap: 6 },
  searchInput: { minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, fontSize: 14 },
  locationBlock: { gap: 7 },
  helperText: { fontSize: 12 },
  locationButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  locationGlyph: { fontSize: 22, lineHeight: 22 },
  locationButtonText: { fontSize: 13, fontWeight: '700' },
  locationSuccess: { fontSize: 11 },
  locationError: { color: '#ed6560', fontSize: 11, lineHeight: 16 },
  brandFilters: { gap: 8 },
  brandOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  brandOption: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkboxMark: { color: '#ffffff', fontSize: 12, lineHeight: 15, fontWeight: '700' },
  storeList: { gap: 10 },
  storeCard: { gap: 7, padding: 14, borderRadius: 14, borderWidth: 1 },
  storeCardSelected: { shadowColor: '#0a0a0a', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  storeCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  storeCardTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeName: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  addressLine: { fontSize: 13, lineHeight: 19 },
  contactLine: { fontSize: 13, lineHeight: 19 },
  distanceLine: { fontSize: 12, lineHeight: 17 },
  cardActions: { minHeight: 28, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  whatsappAction: { fontSize: 13, lineHeight: 20, fontWeight: '700', textDecorationLine: 'underline' },
  mapAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  mapActionText: { fontSize: 13, lineHeight: 20, textDecorationLine: 'underline' },
  mapCard: { gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
  mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  mapStoreName: { flex: 1, fontSize: 12, textAlign: 'right' },
  map: { width: '100%', height: 230, borderRadius: 12, overflow: 'hidden' },
  mapFallback: { minHeight: 230, padding: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapFallbackTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  mapFallbackText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  detailsCard: { gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  detailsTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  detailsBrand: { marginTop: -6, fontSize: 13 },
  detailGroup: { gap: 4 },
  detailLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  detailLink: { fontSize: 14, lineHeight: 20, textDecorationLine: 'underline' },
  hoursList: { gap: 5 },
  hoursListInline: { gap: 2 },
  hoursRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  hoursLabel: { flex: 1, fontSize: 13, lineHeight: 19 },
  hoursValue: { flex: 1, fontSize: 13, lineHeight: 19, textAlign: 'right' },
  primaryAction: { minHeight: 46, paddingHorizontal: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryActionText: { fontSize: 13, fontWeight: '700' },
  emptyState: { minHeight: 170, padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyDescription: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  modalBackdrop: { flex: 1, padding: 18, backgroundColor: 'rgba(0, 0, 0, 0.42)', justifyContent: 'flex-end' },
  pickerSheet: { maxHeight: '78%', borderRadius: 18, overflow: 'hidden' },
  pickerHeader: { minHeight: 56, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e6e2dc', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerTitle: { fontSize: 16, fontWeight: '700' },
  pickerClose: { fontSize: 13, textDecorationLine: 'underline' },
  pickerOptions: { paddingVertical: 6 },
  pickerOption: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center' },
  pickerOptionSelected: { fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
