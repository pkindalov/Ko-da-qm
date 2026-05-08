import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsScreen } from './ProductsScreen';

const makeAddProduct = () => vi.fn().mockResolvedValue(undefined);

const renderScreen = (addProduct = makeAddProduct()) => {
  render(
    <ProductsScreen
      products={[]}
      setProducts={vi.fn()}
      addProduct={addProduct}
      lang="bg"
    />,
  );
  return { addProduct };
};

const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Добави/i }));
};

describe('ProductsScreen – add product', () => {
  it('opens the add modal when the add button is clicked', async () => {
    const user = userEvent.setup();
    renderScreen();
    await openModal(user);
    expect(screen.getByPlaceholderText('напр. Домати')).toBeInTheDocument();
  });

  it('closes the modal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderScreen();
    await openModal(user);
    await user.click(screen.getByRole('button', { name: 'Отказ' }));
    expect(screen.queryByPlaceholderText('напр. Домати')).not.toBeInTheDocument();
  });

  it('closes the modal when the ✕ button is clicked', async () => {
    const user = userEvent.setup();
    renderScreen();
    await openModal(user);
    await user.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByPlaceholderText('напр. Домати')).not.toBeInTheDocument();
  });

  it('does not call addProduct when the name is empty', async () => {
    const user = userEvent.setup();
    const { addProduct } = renderScreen();
    await openModal(user);
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(addProduct).not.toHaveBeenCalled();
  });

  it('does not call addProduct when the name is only whitespace', async () => {
    const user = userEvent.setup();
    const { addProduct } = renderScreen();
    await openModal(user);
    await user.type(screen.getByPlaceholderText('напр. Домати'), '   ');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    expect(addProduct).not.toHaveBeenCalled();
  });

  it('calls addProduct with defaults when only the name is provided', async () => {
    const user = userEvent.setup();
    const { addProduct } = renderScreen();
    await openModal(user);
    await user.type(screen.getByPlaceholderText('напр. Домати'), 'Домати');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    await waitFor(() =>
      expect(addProduct).toHaveBeenCalledWith({
        name: 'Домати',
        emoji: '📦',
        category: 'other',
        status: 'liked',
      }),
    );
  });

  it('closes the modal after a successful add', async () => {
    const user = userEvent.setup();
    renderScreen();
    await openModal(user);
    await user.type(screen.getByPlaceholderText('напр. Домати'), 'Домати');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('напр. Домати')).not.toBeInTheDocument(),
    );
  });

  it('resets the name field when the modal is reopened after a successful add', async () => {
    const user = userEvent.setup();
    renderScreen();
    await openModal(user);
    await user.type(screen.getByPlaceholderText('напр. Домати'), 'Домати');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('напр. Домати')).not.toBeInTheDocument(),
    );
    await openModal(user);
    expect(screen.getByPlaceholderText('напр. Домати')).toHaveValue('');
  });

  it('resets the form when the modal is reopened after cancelling', async () => {
    const user = userEvent.setup();
    renderScreen();
    await openModal(user);
    await user.type(screen.getByPlaceholderText('напр. Домати'), 'Тест');
    await user.click(screen.getByRole('button', { name: 'Отказ' }));
    await openModal(user);
    expect(screen.getByPlaceholderText('напр. Домати')).toHaveValue('');
  });

  it('resets the form when the modal is closed via the ✕ button', async () => {
    const user = userEvent.setup();
    renderScreen();
    await openModal(user);
    await user.type(screen.getByPlaceholderText('напр. Домати'), 'Тест');
    await user.click(screen.getByRole('button', { name: '✕' }));
    await openModal(user);
    expect(screen.getByPlaceholderText('напр. Домати')).toHaveValue('');
  });

  it('calls addProduct with the changed emoji', async () => {
    const user = userEvent.setup();
    const { addProduct } = renderScreen();
    await openModal(user);
    await user.type(screen.getByPlaceholderText('напр. Домати'), 'Краставица');
    const emojiInput = screen.getByDisplayValue('📦');
    await user.clear(emojiInput);
    await user.type(emojiInput, '🥒');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    await waitFor(() =>
      expect(addProduct).toHaveBeenCalledWith(
        expect.objectContaining({ emoji: '🥒', name: 'Краставица' }),
      ),
    );
  });

  it('calls addProduct with the selected category', async () => {
    const user = userEvent.setup();
    const { addProduct } = renderScreen();
    await openModal(user);
    await user.type(screen.getByPlaceholderText('напр. Домати'), 'Домати');
    await user.selectOptions(screen.getByRole('combobox'), 'veg');
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    await waitFor(() =>
      expect(addProduct).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'veg' }),
      ),
    );
  });

  it('calls addProduct with disliked status when the disliked chip is clicked', async () => {
    const user = userEvent.setup();
    const { addProduct } = renderScreen();
    await openModal(user);
    await user.type(screen.getByPlaceholderText('напр. Домати'), 'Лук');
    await user.click(screen.getByText('✗ Не харесвам'));
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    await waitFor(() =>
      expect(addProduct).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'disliked' }),
      ),
    );
  });

  it('calls addProduct with allergic status when the allergic chip is clicked', async () => {
    const user = userEvent.setup();
    const { addProduct } = renderScreen();
    await openModal(user);
    await user.type(screen.getByPlaceholderText('напр. Домати'), 'Ядки');
    await user.click(screen.getByText('⚠ Алергия'));
    await user.click(screen.getByRole('button', { name: 'Запази' }));
    await waitFor(() =>
      expect(addProduct).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'allergic' }),
      ),
    );
  });
});
