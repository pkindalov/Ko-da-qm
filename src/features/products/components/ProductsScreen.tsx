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
  const [newProduct, setNewProduct] = useState({ name: '', emoji: '📦', category: 'other' as Product['category'], status: 'liked' as ProductStatus });
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = filterProducts(products, search, catFilter, lang);
  const pendingDeleteProduct = pendingDeleteId ? (products.find((product) => product.id === pendingDeleteId) ?? null) : null;

  const toggleStatus = (id: string, newStatus: ProductStatus) => {
    setProducts(products.map((product) => (product.id === id ? { ...product, status: newStatus } : product)));
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter((product) => product.id !== id));
    toast.success(isEnglish ? 'Product deleted' : 'Продуктът е изтрит');
  };

  const saveEdit = () => {
    if (!editProduct || !editProduct.name.trim()) return;
    setProducts(products.map((product) => (product.id === editProduct.id ? editProduct : product)));
    setEditProduct(null);
    toast.success(isEnglish ? 'Changes saved' : 'Промените са запазени');
  };

  const handleAddClose = () => {
    setNewProduct({ name: '', emoji: '📦', category: 'other', status: 'liked' });
    setAddOpen(false);
  };

  const handleAdd = async () => {
    if (!newProduct.name.trim()) return;
    await addProduct(newProduct);
    setNewProduct({ name: '', emoji: '📦', category: 'other', status: 'liked' });
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
            {STATUS_FILTERS.map((statusFilter) => (
              <button key={statusFilter.id} className={`chip${catFilter === statusFilter.id ? ' selected' : ''}`} onClick={() => setCatFilter(statusFilter.id)}>
                {isEnglish ? statusFilter.labelEn : statusFilter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stack">
        {filtered.map((product) => (
          <div key={product.id} className="product-row">
            <span className="emoji-md">{product.emoji}</span>
            <span className="product-name">{isEnglish && product.nameEn ? product.nameEn : product.name}</span>
            <div className="product-row-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditProduct(product)} title={isEnglish ? 'Edit' : 'Редактирай'}>✏</button>
              <button className="btn btn-ghost btn-sm btn-danger-text" onClick={() => setPendingDeleteId(product.id)} title={isEnglish ? 'Delete' : 'Изтрий'}>✕</button>
            </div>
            <div className="product-row-tags">
              <div className="product-status-row">
                {(['liked', 'disliked', 'allergic'] as ProductStatus[]).map((status) => (
                  <button
                    key={status}
                    className={`btn btn-sm ${product.status === status ? (status === 'liked' ? 'btn-secondary' : status === 'disliked' ? 'btn-warn' : 'btn-danger') : 'btn-ghost'}`}
                    onClick={() => toggleStatus(product.id, status)}
                    title={status === 'liked' ? (isEnglish ? 'I like this' : 'Харесвам') : status === 'disliked' ? (isEnglish ? 'I dislike this' : 'Не харесвам') : (isEnglish ? 'I am allergic' : 'Алергия')}
                  >
                    {status === 'liked' ? '✓' : status === 'disliked' ? '✗' : '⚠'}
                  </button>
                ))}
              </div>
              <Badge type={statusBadge(product.status)}>{statusLabel(product.status, lang)}</Badge>
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

      <Modal open={editProduct != null} onClose={() => setEditProduct(null)} title={isEnglish ? 'Edit Product' : 'Редактирай продукт'}>
        {editProduct && (
          <>
            <div className="product-edit-row">
              <div className="flex-1">
                <label className="input-label">{isEnglish ? 'Product name' : 'Продукт'}</label>
                <input className="input-field" value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} autoFocus />
              </div>
              <div className="product-edit-emoji-wrap">
                <label className="input-label">Emoji</label>
                <input className="input-field input-center" value={editProduct.emoji} onChange={(e) => setEditProduct({ ...editProduct, emoji: e.target.value })} />
              </div>
            </div>
            <div className="product-edit-mb">
              <label className="input-label">{isEnglish ? 'Category' : 'Категория'}</label>
              <select className="input-field" value={editProduct.category} onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value as Product['category'] })}>
                {CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>{category.emoji} {isEnglish ? category.labelEn : category.label}</option>
                ))}
              </select>
            </div>
            <div className="product-edit-mb-lg">
              <label className="input-label">{isEnglish ? 'My relationship with this food' : 'Моето отношение'}</label>
              <div className="chip-group">
                <span role="button" tabIndex={0} className={`chip${editProduct.status === 'liked' ? ' selected' : ''}`} onClick={() => setEditProduct({ ...editProduct, status: 'liked' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditProduct({ ...editProduct, status: 'liked' }); } }}>✓ {isEnglish ? 'I like it' : 'Харесвам'}</span>
                <span role="button" tabIndex={0} className={`chip${editProduct.status === 'disliked' ? ' sel-warn' : ''}`} onClick={() => setEditProduct({ ...editProduct, status: 'disliked' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditProduct({ ...editProduct, status: 'disliked' }); } }}>✗ {isEnglish ? 'I dislike it' : 'Не харесвам'}</span>
                <span role="button" tabIndex={0} className={`chip${editProduct.status === 'allergic' ? ' sel-danger' : ''}`} onClick={() => setEditProduct({ ...editProduct, status: 'allergic' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditProduct({ ...editProduct, status: 'allergic' }); } }}>⚠ {isEnglish ? 'Allergic' : 'Алергия'}</span>
              </div>
            </div>
            <div className="product-edit-actions">
              <button className="btn btn-primary flex-1" onClick={saveEdit}>{isEnglish ? 'Save' : 'Запази'}</button>
              <button className="btn btn-ghost" onClick={() => setEditProduct(null)}>{isEnglish ? 'Cancel' : 'Отказ'}</button>
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
            <input className="input-field" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder={isEnglish ? 'e.g. Tomatoes' : 'напр. Домати'} autoFocus />
          </div>
          <div className="product-edit-emoji-wrap">
            <label className="input-label">Emoji</label>
            <input className="input-field input-center" value={newProduct.emoji} onChange={(e) => setNewProduct({ ...newProduct, emoji: e.target.value })} />
          </div>
        </div>
        <div className="product-edit-mb">
          <label className="input-label">{isEnglish ? 'Category' : 'Категория'}</label>
          <select className="input-field" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as Product['category'] })}>
            {CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>{category.emoji} {isEnglish ? category.labelEn : category.label}</option>
            ))}
          </select>
        </div>
        <div className="product-edit-mb-lg">
          <label className="input-label">{isEnglish ? 'My relationship with this food' : 'Моето отношение'}</label>
          <div className="chip-group">
            <span role="button" tabIndex={0} className={`chip${newProduct.status === 'liked' ? ' selected' : ''}`} onClick={() => setNewProduct({ ...newProduct, status: 'liked' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNewProduct({ ...newProduct, status: 'liked' }); } }}>✓ {isEnglish ? 'I like it' : 'Харесвам'}</span>
            <span role="button" tabIndex={0} className={`chip${newProduct.status === 'disliked' ? ' sel-warn' : ''}`} onClick={() => setNewProduct({ ...newProduct, status: 'disliked' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNewProduct({ ...newProduct, status: 'disliked' }); } }}>✗ {isEnglish ? 'I dislike it' : 'Не харесвам'}</span>
            <span role="button" tabIndex={0} className={`chip${newProduct.status === 'allergic' ? ' sel-danger' : ''}`} onClick={() => setNewProduct({ ...newProduct, status: 'allergic' })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNewProduct({ ...newProduct, status: 'allergic' }); } }}>⚠ {isEnglish ? 'Allergic' : 'Алергия'}</span>
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
