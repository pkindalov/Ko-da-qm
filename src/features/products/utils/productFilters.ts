import type { Product, Language } from '../../../shared/types';

export function filterProducts(
  products: Product[],
  search: string,
  catFilter: string,
  lang: Language,
): Product[] {
  const isEnglish = lang === 'en';
  return products.filter((p) => {
    const name = isEnglish && p.nameEn ? p.nameEn : p.name;
    const matchSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter || catFilter === p.status;
    return matchSearch && matchCat;
  });
}
