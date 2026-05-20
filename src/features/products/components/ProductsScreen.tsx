import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../../../shared/components/Modal';
import { Badge } from '../../../shared/components/Badge';
import { ConfirmDeleteModal } from '../../../shared/components/ConfirmDeleteModal';
import { EmptyState } from '../../../shared/components/EmptyState';
import { CATEGORIES } from '../../../shared/constants/categories';
import { filterProducts } from '../utils/productFilters';
import { statusBadge, statusLabel } from '../utils/productStatus';
import type { Product, ProductStatus, Language } from '../../../shared/types';

interface ProductsScreenProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  lang: Language;
}

const STATUS_FILTERS = [
  { id: 'all',      label: 'Всички',        labelEn: 'All'     },
  { id: 'liked',    label: 'Харесвам',      labelEn: 'Safe'    },
  { id: 'disliked', label: 'Не харесвам',   labelEn: 'Dislike' },
  { id: 'allergic', label: 'Алергия',       labelEn: 'Allergy' },
];

export const ProductsScreen = ({ products, setProducts, addProduct, lang }: ProductsScreenProps) => {
  const isEnglish = lang === 'en';
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [newP, setNewP] = useState({ name: '', emoji: '📦', category: 'other' as Product['category'], status: 'liked' as ProductStatus });
  const [editP, setEditP] = useState<Product | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = filterProducts(products, search, catFilter, lang);
  const pendingDeleteProduct = pendingDeleteId ? (products.find((p) => p.id === pendingDeleteId) ?? null) : null;

  const toggleStatus = (id: string, newStatus: ProductStatus) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
    toast.success(isEnglish ? 'Product deleted' : 'Продуктът е изтрит');
  };

  const saveEdit = () => {
    if (!editP || !editP.name.trim()) return;
    setProducts(products.map((p) => (p.id === editP.id ? editP : p)));
    setEditP(null);
    toast.success(isEnglish ? 'Changes saved' : 'Промените са запазени');
  };

  const handleAddClose = () => {
    setNewP({ name: '', emoji: '📦', category: 'other', status: 'liked' });
    setAddOpen(false);
  };

  const handleAdd = async () => {
    if (!newP.name.trim()) return;
    await addProduct(newP);
    setNewP({ name: '', emoji: '📦', category: 'other', status: 'liked' });
    setAddOpen(false);
  };


  return (
    <div className="fade-in">
      <div className="topbar">
        <div className="breadcrumb">
          {isEnglish ? 'Kitchen' : 'Кухня'} <span>/ {isEnglish ? 'Products' : 'Продукти'}</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(true)}>
            + {isEnglish ? 'Add product' : 'Добави'}
          </button>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-mb">{isEnglish ?"What I eat & what I don't" : 'Какво ям и какво не'}</div>
          <h1 className="h-title italic">{isEnglish ? 'Products' : 'Продукти'}</h1>
          <div className="page-head-sub mt-2">
            {isEnglish ? 'Tap a status to toggle safe / dislike / allergy.' : 'Натисни статуса, за да превключиш безопасно / нелюбимо / алергия.'}
          </div>
        </div>
        <div className="stack">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input className="input-field" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isEnglish ? 'Search products…' : 'Търси…'} />
          </div>
          <div className="chip-group">
            {STATUS_FILTERS.map((f) => (
              <button key={f.id} className={`chip${catFilter === f.id ? ' selected' : ''}`} onClick={() => setCatFilter(f.id)}>
                {isEnglish ?f.labelEn : f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stack">
        {filtered.map((p) => (
          <div key={p.id} className="product-row">
            <span className="emoji-md">{p.emoji}</span>
            <span className="product-name">{isEnglish && p.nameEn ? p.nameEn : p.name}</span>
            <div className="product-row-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditP(p)} title={isEnglish ? 'Edit' : 'Редактирай'}>✏</button>
              <button className="btn btn-ghost btn-sm btn-danger-text" onClick={() => setPendingDeleteId(p.id)} title={isEnglish ? 'Delete' : 'Изтрий'}>✕</button>
            </div>
            <div className="product-row-tags">
              <div className="product-status-row">
                {(['liked', 'disliked', 'allergic'] as ProductStatus[]).map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${p.status === s ? (s === 'liked' ? 'btn-secondary' : s === 'disliked' ? 'btn-warn' : 'btn-danger') : 'btn-ghost'}`}
                    onClick={() => toggleStatus(p.id, s)}
                    title={s === 'liked' ? (isEnglish ? 'I like this' : 'Харесвам') : s === 'disliked' ? (isEnglish ? 'I dislike this' : 'Не харесвам') : (isEnglish ? 'I am allergic' : 'Алергия')}
                  >
                    {s === 'liked' ? '✓' : s === 'disliked' ? '✗' : '⚠'}
                  </button>
                ))}
              </div>
              <Badge type={statusBadge(p.status)}>{statusLabel(p.status, lang)}</Badge>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <EmptyState
            icon="🥕"
            title={isEnglish ? 'No products found' : 'Няма намерени продукти'}
            subtitle={isEnglish ? 'Add a product to get started' : 'Добави продукт'}
          />
        )}
      </div>

      <Modal open={editP != null} onClose={() => setEditP(null)} title={isEnglish ? 'Edit Product' : 'Редактирай продукт'}>
        {editP && (
          <>
            <div className="product-edit-row">
              <div className="flex-1">
                <label className="input-label">{isEnglish ? 'Product name' : 'Продукт'}</label>
                <input className="input-field" value={editP.name} onChange={(e) => setEditP({ ...editP, name: e.target.value })} autoFocus />
              </div>
              <div className="product-edit-emoji-wrap">
                <label className="input-label">Emoji</label>
                <input className="input-field input-center" value={editP.emoji} onChange={(e) => setEditP({ ...editP, emoji: e.target.value })} />
              </div>
            </div>
            <div className="product-edit-mb">
              <label className="input-label">{isEnglish ? 'Category' : 'Категория'}</label>
              <select className="input-field" value={editP.category} onChange={(e) => setEditP({ ...editP, category: e.target.value as Product['category'] })}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {isEnglish ?c.labelEn : c.label}</option>
                ))}
              </select>
            </div>
            <div className="product-edit-mb-lg">
              <label className="input-label">{isEnglish ? 'My relationship with this food' : 'Моето отношение'}</label>
              <div className="chip-group">
                <span className={`chip${editP.status === 'liked' ? ' selected' : ''}`} onClick={() => setEditP({ ...editP, status: 'liked' })}>✓ {isEnglish ? 'I like it' : 'Харесвам'}</span>
                <span className={`chip${editP.status === 'disliked' ? ' sel-warn' : ''}`} onClick={() => setEditP({ ...editP, status: 'disliked' })}>✗ {isEnglish ? 'I dislike it' : 'Не харесвам'}</span>
                <span className={`chip${editP.status === 'allergic' ? ' sel-danger' : ''}`} onClick={() => setEditP({ ...editP, status: 'allergic' })}>⚠ {isEnglish ? 'Allergic' : 'Алергия'}</span>
              </div>
            </div>
            <div className="product-edit-actions">
              <button className="btn btn-primary flex-1" onClick={saveEdit}>{isEnglish ? 'Save' : 'Запази'}</button>
              <button className="btn btn-ghost" onClick={() => setEditP(null)}>{isEnglish ? 'Cancel' : 'Отказ'}</button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDeleteModal
        open={pendingDeleteId !== null}
        itemName={pendingDeleteProduct ? (isEnglish && pendingDeleteProduct.nameEn ? pendingDeleteProduct.nameEn : pendingDeleteProduct.name) : ''}
        lang={lang}
        onConfirm={() => { if (pendingDeleteId) deleteProduct(pendingDeleteId); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />

      <Modal open={addOpen} onClose={handleAddClose} title={isEnglish ? 'Add Product' : 'Добави продукт'}>
        <div className="product-edit-row">
          <div className="flex-1">
            <label className="input-label">{isEnglish ? 'Product name' : 'Продукт'}</label>
            <input className="input-field" value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })}
              placeholder={isEnglish ? 'e.g. Tomatoes' : 'напр. Домати'} autoFocus />
          </div>
          <div className="product-edit-emoji-wrap">
            <label className="input-label">Emoji</label>
            <input className="input-field input-center" value={newP.emoji} onChange={(e) => setNewP({ ...newP, emoji: e.target.value })} />
          </div>
        </div>
        <div className="product-edit-mb">
          <label className="input-label">{isEnglish ? 'Category' : 'Категория'}</label>
          <select className="input-field" value={newP.category} onChange={(e) => setNewP({ ...newP, category: e.target.value as Product['category'] })}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {isEnglish ?c.labelEn : c.label}</option>
            ))}
          </select>
        </div>
        <div className="product-edit-mb-lg">
          <label className="input-label">{isEnglish ? 'My relationship with this food' : 'Моето отношение'}</label>
          <div className="chip-group">
            <span className={`chip${newP.status === 'liked' ? ' selected' : ''}`} onClick={() => setNewP({ ...newP, status: 'liked' })}>✓ {isEnglish ? 'I like it' : 'Харесвам'}</span>
            <span className={`chip${newP.status === 'disliked' ? ' sel-warn' : ''}`} onClick={() => setNewP({ ...newP, status: 'disliked' })}>✗ {isEnglish ? 'I dislike it' : 'Не харесвам'}</span>
            <span className={`chip${newP.status === 'allergic' ? ' sel-danger' : ''}`} onClick={() => setNewP({ ...newP, status: 'allergic' })}>⚠ {isEnglish ? 'Allergic' : 'Алергия'}</span>
          </div>
        </div>
        <div className="product-edit-actions">
          <button className="btn btn-primary flex-1" onClick={handleAdd}>{isEnglish ? 'Save' : 'Запази'}</button>
          <button className="btn btn-ghost" onClick={handleAddClose}>{isEnglish ? 'Cancel' : 'Отказ'}</button>
        </div>
      </Modal>
    </div>
  );
}
