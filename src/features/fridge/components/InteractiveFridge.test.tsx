import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InteractiveFridge } from './InteractiveFridge';
import type { FridgeItem } from '../../../shared/types';

const makeItem = (overrides: Partial<FridgeItem> = {}): FridgeItem => ({
  id: 'item-1',
  name: 'Test',
  emoji: '📦',
  category: 'other',
  ...overrides,
});

describe('InteractiveFridge – shelf placement', () => {
  it('renders all provided items', () => {
    render(
      <InteractiveFridge
        items={[
          makeItem({ id: '1', name: 'Домати', category: 'veg' }),
          makeItem({ id: '2', name: 'Яйца', category: 'egg' }),
          makeItem({ id: '3', name: 'Сладолед', category: 'frozen' }),
        ]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
      />,
    );
    expect(screen.getByText('Домати')).toBeInTheDocument();
    expect(screen.getByText('Яйца')).toBeInTheDocument();
    expect(screen.getByText('Сладолед')).toBeInTheDocument();
  });

  it('places a frozen item in the freezer compartment', () => {
    const { container } = render(
      <InteractiveFridge
        items={[makeItem({ id: 'frozen-1', name: 'Сладолед', emoji: '🍦', category: 'frozen' })]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
      />,
    );
    const freezer = container.querySelector('.shelves > .freezer') as HTMLElement;
    expect(within(freezer).getByText('Сладолед')).toBeInTheDocument();
  });

  it('does not place a non-frozen item in the freezer', () => {
    const { container } = render(
      <InteractiveFridge
        items={[makeItem({ id: 'veg-1', name: 'Домати', category: 'veg' })]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
      />,
    );
    const freezer = container.querySelector('.shelves > .freezer') as HTMLElement;
    expect(within(freezer).queryByText('Домати')).not.toBeInTheDocument();
  });

  it('renders with an empty item list without errors', () => {
    expect(() =>
      render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} />),
    ).not.toThrow();
  });

  it('handles an unknown category by defaulting to shelf 2', () => {
    const { container } = render(
      <InteractiveFridge
        items={[makeItem({ id: 'x', name: 'Нещо', category: 'other' })]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
      />,
    );
    const freezer = container.querySelector('.shelves > .freezer') as HTMLElement;
    // Unknown/other category falls to shelf 2, not the freezer
    expect(within(freezer).queryByText('Нещо')).not.toBeInTheDocument();
    expect(screen.getByText('Нещо')).toBeInTheDocument();
  });
});

describe('InteractiveFridge – selection state', () => {
  it('adds the selected class to items whose id is in selectedIds', () => {
    const { container } = render(
      <InteractiveFridge
        items={[
          makeItem({ id: 'a', name: 'Домати', category: 'veg' }),
          makeItem({ id: 'b', name: 'Яйца', category: 'egg' }),
        ]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        selectedIds={new Set(['a'])}
        onToggleSelect={vi.fn()}
      />,
    );
    const selected = container.querySelectorAll('.product.selected');
    expect(selected).toHaveLength(1);
  });

  it('does not mark any item as selected when selectedIds is empty', () => {
    const { container } = render(
      <InteractiveFridge
        items={[makeItem({ id: 'a', name: 'Домати', category: 'veg' })]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
      />,
    );
    expect(container.querySelectorAll('.product.selected')).toHaveLength(0);
  });

  it('applies selectable class when onToggleSelect is provided', () => {
    const { container } = render(
      <InteractiveFridge
        items={[makeItem({ id: 'a', name: 'Домати', category: 'veg' })]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    expect(container.querySelector('.product.selectable')).not.toBeNull();
  });

  it('does not apply selectable class when onToggleSelect is absent', () => {
    const { container } = render(
      <InteractiveFridge
        items={[makeItem({ id: 'a', name: 'Домати', category: 'veg' })]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
      />,
    );
    expect(container.querySelector('.product.selectable')).toBeNull();
  });
});

describe('InteractiveFridge – interactions', () => {
  it('calls onToggleSelect with item id when a product is clicked', async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    const { container } = render(
      <InteractiveFridge
        items={[makeItem({ id: 'item-1', name: 'Домати', category: 'veg' })]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        onToggleSelect={onToggleSelect}
      />,
    );
    await user.click(container.querySelector('.product') as HTMLElement);
    expect(onToggleSelect).toHaveBeenCalledWith('item-1');
  });

  it('calls onRemove with item id when the remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const { container } = render(
      <InteractiveFridge
        items={[makeItem({ id: 'item-1', name: 'Домати', category: 'veg' })]}
        onRemove={onRemove}
        onAddSlot={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    await user.click(container.querySelector('.p-rm') as HTMLElement);
    expect(onRemove).toHaveBeenCalledWith('item-1');
  });

  it('does not call onToggleSelect when the remove button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    const { container } = render(
      <InteractiveFridge
        items={[makeItem({ id: 'item-1', name: 'Домати', category: 'veg' })]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        onToggleSelect={onToggleSelect}
      />,
    );
    await user.click(container.querySelector('.p-rm') as HTMLElement);
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('calls onAddSlot when the + button is clicked', async () => {
    const user = userEvent.setup();
    const onAddSlot = vi.fn();
    const { container } = render(
      <InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={onAddSlot} />,
    );
    await user.click(container.querySelector('.add-slot') as HTMLElement);
    expect(onAddSlot).toHaveBeenCalled();
  });

  it('hides the + button in a shelf when it is at capacity (5 items)', () => {
    const fullShelfItems: FridgeItem[] = Array.from({ length: 5 }, (_, i) =>
      makeItem({ id: `v${i}`, name: `Зеленчук${i}`, category: 'veg' }),
    );
    const { container } = render(
      <InteractiveFridge items={fullShelfItems} onRemove={vi.fn()} onAddSlot={vi.fn()} />,
    );
    // Shelf 3 (veg) has 5 items — its add-slot button should be absent.
    // Other shelves still show their + buttons, so we check the veg shelf specifically.
    const vegShelf = Array.from(container.querySelectorAll('.shelf')).find((shelf) =>
      shelf.querySelectorAll('.product').length === 5,
    );
    expect(vegShelf).toBeDefined();
    expect(vegShelf!.querySelector('.add-slot')).toBeNull();
  });
});

describe('InteractiveFridge – door toggle', () => {
  it('shows the "Open fridge" button by default', () => {
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} />);
    expect(screen.getByRole('button', { name: /open fridge/i })).toBeInTheDocument();
  });

  it('shows "Close door" after the door is opened', async () => {
    const user = userEvent.setup();
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /open fridge/i }));
    expect(screen.getByRole('button', { name: /close door/i })).toBeInTheDocument();
  });

  it('toggles back to "Open fridge" when the door is closed again', async () => {
    const user = userEvent.setup();
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /open fridge/i }));
    await user.click(screen.getByRole('button', { name: /close door/i }));
    expect(screen.getByRole('button', { name: /open fridge/i })).toBeInTheDocument();
  });
});
