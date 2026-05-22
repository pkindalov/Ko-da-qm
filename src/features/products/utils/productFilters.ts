import type { Product, Language } from '../../../shared/types';

export const filterProducts = (
  products: Product[],
  search: string,
  catFilter: string,
  lang: Language,
): Product[] => {
  const isEnglish = lang === 'en';
  return products.filter((product) => {
    const name = isEnglish && product.nameEn ? product.nameEn : product.name;
    const matchSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || product.category === catFilter || catFilter === product.status;
    return matchSearch && matchCat;
  });
};
