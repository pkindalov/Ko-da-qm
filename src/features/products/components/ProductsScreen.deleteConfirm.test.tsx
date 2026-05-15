import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsScreen } from './ProductsScreen';
import type { Product } from '../../../shared/types';

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Tomatoes',
  emoji: '🍅',
  category: 'veg',
  status: 'liked',
  ...overrides,
});

const makeProps = (overrides: Partial<Parameters<typeof ProductsScreen>[0]> = {}) => ({
  products: [makeProduct()] as Product[],
  setProducts: vi.fn(),
  addProduct: vi.fn().mockResolvedValue(undefined),
  lang: 'en' as const,
  ...overrides,
});

describe('ProductsScreen – delete product confirmation modal', () => {
  let setProducts: ReturnType<typeof vi.fn<(products: Product[]) => void>>;

  beforeEach(() => {
    setProducts = vi.fn<(products: Product[]) => void>();
  });

  it('does not call setProducts when the delete button is clicked without confirming', async () => {
    const user = userEvent.setup();
    render(<ProductsScreen {...makeProps({ setProducts })} />);

    await user.click(screen.getByTitle('Delete'));

    expect(setProducts).not.toHaveBeenCalled();
  });

  it('shows a confirmation modal when the delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductsScreen {...makeProps()} />);

    await user.click(screen.getByTitle('Delete'));

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('shows the product name in the confirmation modal', async () => {
    const user = userEvent.setup();
    render(<ProductsScreen {...makeProps({ products: [makeProduct({ name: 'Tomatoes' })] })} />);

    await user.click(screen.getByTitle('Delete'));

    expect(screen.getByText('Delete "Tomatoes"?')).toBeInTheDocument();
  });

  it('calls setProducts without the deleted product when confirmed', async () => {
    const user = userEvent.setup();
    const products = [
      makeProduct({ id: 'p1', name: 'Tomatoes' }),
      makeProduct({ id: 'p2', name: 'Cheese' }),
    ];
    render(<ProductsScreen {...makeProps({ products, setProducts })} />);

    const deleteButtons = screen.getAllByTitle('Delete');
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(setProducts).toHaveBeenCalledWith([products[1]]);
  });

  it('does not call setProducts when Cancel is clicked in the modal', async () => {
    const user = userEvent.setup();
    render(<ProductsScreen {...makeProps({ setProducts })} />);

    await user.click(screen.getByTitle('Delete'));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(setProducts).not.toHaveBeenCalled();
  });

  it('closes the confirmation modal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductsScreen {...makeProps()} />);

    await user.click(screen.getByTitle('Delete'));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('closes the confirmation modal after confirming', async () => {
    const user = userEvent.setup();
    render(<ProductsScreen {...makeProps({ setProducts })} />);

    await user.click(screen.getByTitle('Delete'));
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('shows nameEn in the confirmation modal when lang is en and nameEn is set', async () => {
    const user = userEvent.setup();
    const product = makeProduct({ name: 'Домати', nameEn: 'Tomatoes' });
    render(<ProductsScreen {...makeProps({ products: [product] })} />);

    await user.click(screen.getByTitle('Delete'));

    expect(screen.getByText('Delete "Tomatoes"?')).toBeInTheDocument();
  });

  it('shows Bulgarian confirmation text when lang is bg', async () => {
    const user = userEvent.setup();
    render(<ProductsScreen {...makeProps({ lang: 'bg' })} />);

    await user.click(screen.getByTitle('Изтрий'));

    expect(screen.getByText('Потвърди изтриване')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Потвърди/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Отказ/i })).toBeInTheDocument();
  });

  it('can delete a second product after canceling deletion of the first', async () => {
    const user = userEvent.setup();
    const products = [
      makeProduct({ id: 'p1', name: 'Tomatoes' }),
      makeProduct({ id: 'p2', name: 'Cheese' }),
    ];
    render(<ProductsScreen {...makeProps({ products, setProducts })} />);

    const deleteButtons = screen.getAllByTitle('Delete');
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    await user.click(deleteButtons[1]);
    await user.click(screen.getByRole('button', { name: /Confirm/i }));

    expect(setProducts).toHaveBeenCalledWith([products[0]]);
  });
});
