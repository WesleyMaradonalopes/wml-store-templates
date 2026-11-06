import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

export type CategoryMenuStyle = 'classic' | 'imageBackground';

type CategoryMenuStyleContextValue = {
  temporaryCategoryMenuStyle: CategoryMenuStyle | null;
  setTemporaryCategoryMenuStyle: (style: CategoryMenuStyle | null) => void;
};

const CategoryMenuStyleContext = createContext<CategoryMenuStyleContextValue | null>(null);

export function CategoryMenuStyleProvider({ children }: PropsWithChildren) {
  const [temporaryCategoryMenuStyle, setTemporaryCategoryMenuStyle] = useState<CategoryMenuStyle | null>(null);
  const value = useMemo(() => ({ temporaryCategoryMenuStyle, setTemporaryCategoryMenuStyle }), [temporaryCategoryMenuStyle]);

  return <CategoryMenuStyleContext.Provider value={value}>{children}</CategoryMenuStyleContext.Provider>;
}

export function useCategoryMenuStyleOverride() {
  const context = useContext(CategoryMenuStyleContext);
  if (!context) throw new Error('useCategoryMenuStyleOverride must be used inside CategoryMenuStyleProvider');
  return context;
}
