import { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Badge } from '../../../shared/components/Badge';
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

export function ProductsScreen({ products, setProducts, addProduct, lang }: ProductsScreenProps) {
  const L = lang === 'en';
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [newP, setNewP] = useState({ name: '', emoji: '📦', category: 'other' as Product['category'], status: 'liked' as ProductStatus });
  const [editP, setEditP] = useState<Product | null>(null);

  const filtered = filterProducts(products, search, catFilter, lang);

  const toggleStatus = (id: string, newStatus: ProductStatus) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const saveEdit = () => {
    if (!editP || !editP.name.trim()) return;
    setProducts(products.map((p) => (p.id === editP.id ? editP : p)));
    setEditP(null);
  };

  const handleAdd = async () => {
    if (!newP.name.trim()) return;
    await addProduct(newP);
    setNewP({ name: '', emoji: '📦', category: 'other', status: 'liked' });
    setAddOpen(false);
  };


  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div className="page-title">🥕 {L ? 'Products' : 'Продукти'}</div>
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ {L ? 'Add' : 'Добави'}</button>
        </div>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="input-field" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L ? 'Search...' : 'Търси...'} />
        </div>
        <div className="chip-group" style={{ marginTop: 8 }}>
          {STATUS_FILTERS.map((f) => (
            <button key={f.id} className={`chip${catFilter === f.id ? ' selected' : ''}`} onClick={() => setCatFilter(f.id)}>
              {L ? f.labelEn : f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stack">
        {filtered.map((p) => (
          <div key={p.id} className="product-row">
            <span style={{ fontSize: 22 }}>{p.emoji}</span>
            <span className="product-name">{L && p.nameEn ? p.nameEn : p.name}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['liked', 'disliked', 'allergic'] as ProductStatus[]).map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm ${p.status === s ? (s === 'liked' ? 'btn-secondary' : s === 'disliked' ? '' : 'btn-danger') : 'btn-ghost'}`}
                  style={p.status === s && s === 'disliked' ? { background: 'var(--warn-light)', color: 'var(--warn)' } : {}}
                  onClick={() => toggleStatus(p.id, s)}
                  title={s === 'liked' ? (L ? 'I like this' : 'Харесвам') : s === 'disliked' ? (L ? 'I dislike this' : 'Не харесвам') : (L ? 'I am allergic' : 'Алергия')}
                >
                  {s === 'liked' ? '✓' : s === 'disliked' ? '✗' : '⚠'}
                </button>
              ))}
            </div>
            <Badge type={statusBadge(p.status)}>{statusLabel(p.status, lang)}</Badge>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditP(p)} title={L ? 'Edit' : 'Редактирай'}>✏</button>
            <button className="btn btn-ghost btn-sm" onClick={() => deleteProduct(p.id)} title={L ? 'Delete' : 'Изтрий'} style={{ color: 'var(--danger)' }}>✕</button>
          </div>
        ))}
        {filtered.length === 0 && (
          <EmptyState
            icon="🥕"
            title={L ? 'No products found' : 'Няма намерени продукти'}
            subtitle={L ? 'Add a product to get started' : 'Добави продукт'}
          />
        )}
      </div>

      <Modal open={!!editP} onClose={() => setEditP(null)} title={L ? 'Edit Product' : 'Редактирай продукт'}>
        {editP && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="input-label">{L ? 'Product name' : 'Продукт'}</label>
                <input className="input-field" value={editP.name} onChange={(e) => setEditP({ ...editP, name: e.target.value })} autoFocus />
              </div>
              <div style={{ width: 70 }}>
                <label className="input-label">Emoji</label>
                <input className="input-field" value={editP.emoji} onChange={(e) => setEditP({ ...editP, emoji: e.target.value })}
                  style={{ textAlign: 'center', fontSize: 20 }} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="input-label">{L ? 'Category' : 'Категория'}</label>
              <select className="input-field" value={editP.category} onChange={(e) => setEditP({ ...editP, category: e.target.value as Product['category'] })}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {L ? c.labelEn : c.label}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="input-label">{L ? 'My relationship with this food' : 'Моето отношение'}</label>
              <div className="chip-group">
                <span className={`chip${editP.status === 'liked' ? ' selected' : ''}`} onClick={() => setEditP({ ...editP, status: 'liked' })}>✓ {L ? 'I like it' : 'Харесвам'}</span>
                <span className={`chip${editP.status === 'disliked' ? ' sel-warn' : ''}`} onClick={() => setEditP({ ...editP, status: 'disliked' })}>✗ {L ? 'I dislike it' : 'Не харесвам'}</span>
                <span className={`chip${editP.status === 'allergic' ? ' sel-danger' : ''}`} onClick={() => setEditP({ ...editP, status: 'allergic' })}>⚠ {L ? 'Allergic' : 'Алергия'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveEdit}>{L ? 'Save' : 'Запази'}</button>
              <button className="btn btn-ghost" onClick={() => setEditP(null)}>{L ? 'Cancel' : 'Отказ'}</button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={L ? 'Add Product' : 'Добави продукт'}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="input-label">{L ? 'Product name' : 'Продукт'}</label>
            <input className="input-field" value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })}
              placeholder={L ? 'e.g. Tomatoes' : 'напр. Домати'} autoFocus />
          </div>
          <div style={{ width: 70 }}>
            <label className="input-label">Emoji</label>
            <input className="input-field" value={newP.emoji} onChange={(e) => setNewP({ ...newP, emoji: e.target.value })}
              style={{ textAlign: 'center', fontSize: 20 }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="input-label">{L ? 'Category' : 'Категория'}</label>
          <select className="input-field" value={newP.category} onChange={(e) => setNewP({ ...newP, category: e.target.value as Product['category'] })}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {L ? c.labelEn : c.label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="input-label">{L ? 'My relationship with this food' : 'Моето отношение'}</label>
          <div className="chip-group">
            <span className={`chip${newP.status === 'liked' ? ' selected' : ''}`} onClick={() => setNewP({ ...newP, status: 'liked' })}>✓ {L ? 'I like it' : 'Харесвам'}</span>
            <span className={`chip${newP.status === 'disliked' ? ' sel-warn' : ''}`} onClick={() => setNewP({ ...newP, status: 'disliked' })}>✗ {L ? 'I dislike it' : 'Не харесвам'}</span>
            <span className={`chip${newP.status === 'allergic' ? ' sel-danger' : ''}`} onClick={() => setNewP({ ...newP, status: 'allergic' })}>⚠ {L ? 'Allergic' : 'Алергия'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAdd}>{L ? 'Save' : 'Запази'}</button>
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>{L ? 'Cancel' : 'Отказ'}</button>
        </div>
      </Modal>
    </div>
  );
}
