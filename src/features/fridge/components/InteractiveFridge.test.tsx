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
        lang="en"
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
        lang="en"
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
        lang="en"
      />,
    );
    const freezer = container.querySelector('.shelves > .freezer') as HTMLElement;
    expect(within(freezer).queryByText('Домати')).not.toBeInTheDocument();
  });

  it('renders with an empty item list without errors', () => {
    expect(() =>
      render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="en" />),
    ).not.toThrow();
  });

  it('handles an unknown category by defaulting to shelf 2', () => {
    const { container } = render(
      <InteractiveFridge
        items={[makeItem({ id: 'x', name: 'Нещо', category: 'other' })]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
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
        lang="en"
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
        lang="en"
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
        lang="en"
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
        lang="en"
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
        lang="en"
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
        lang="en"
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
        lang="en"
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
      <InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={onAddSlot} lang="en" />,
    );
    await user.click(container.querySelector('.add-slot') as HTMLElement);
    expect(onAddSlot).toHaveBeenCalled();
  });

  it('hides the + button in a shelf when it is at capacity (5 items)', () => {
    const fullShelfItems: FridgeItem[] = Array.from({ length: 5 }, (_, i) =>
      makeItem({ id: `v${i}`, name: `Зеленчук${i}`, category: 'veg' }),
    );
    const { container } = render(
      <InteractiveFridge items={fullShelfItems} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="en" />,
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

describe('InteractiveFridge – door toggle (English)', () => {
  it('shows the "Open fridge" button by default', () => {
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="en" />);
    expect(screen.getByRole('button', { name: /open fridge/i })).toBeInTheDocument();
  });

  it('shows "Close door" after the door is opened', async () => {
    const user = userEvent.setup();
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="en" />);
    await user.click(screen.getByRole('button', { name: /open fridge/i }));
    expect(screen.getByRole('button', { name: /close door/i })).toBeInTheDocument();
  });

  it('toggles back to "Open fridge" when the door is closed again', async () => {
    const user = userEvent.setup();
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="en" />);
    await user.click(screen.getByRole('button', { name: /open fridge/i }));
    await user.click(screen.getByRole('button', { name: /close door/i }));
    expect(screen.getByRole('button', { name: /open fridge/i })).toBeInTheDocument();
  });

  it('shows "Tap to open" hint when door is closed', () => {
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="en" />);
    expect(screen.getByText(/tap to open/i)).toBeInTheDocument();
  });

  it('hides the "Tap to open" hint when door is open', async () => {
    const user = userEvent.setup();
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="en" />);
    await user.click(screen.getByRole('button', { name: /open fridge/i }));
    expect(screen.queryByText(/tap to open/i)).not.toBeInTheDocument();
  });

  it('shows "Door closed" status by default', () => {
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="en" />);
    expect(screen.getByText(/door closed/i)).toBeInTheDocument();
  });

  it('shows "Door open" status when door is open', async () => {
    const user = userEvent.setup();
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="en" />);
    await user.click(screen.getByRole('button', { name: /open fridge/i }));
    expect(screen.getByText(/door open/i)).toBeInTheDocument();
  });
});

describe('InteractiveFridge – door toggle (Bulgarian)', () => {
  it('shows the Bulgarian "Отвори хладилника" button by default', () => {
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="bg" />);
    expect(screen.getByRole('button', { name: /отвори хладилника/i })).toBeInTheDocument();
  });

  it('shows Bulgarian "Затвори" after the door is opened', async () => {
    const user = userEvent.setup();
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="bg" />);
    await user.click(screen.getByRole('button', { name: /отвори хладилника/i }));
    expect(screen.getByRole('button', { name: /затвори/i })).toBeInTheDocument();
  });

  it('toggles back to Bulgarian open button when the door is closed again', async () => {
    const user = userEvent.setup();
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="bg" />);
    await user.click(screen.getByRole('button', { name: /отвори хладилника/i }));
    await user.click(screen.getByRole('button', { name: /затвори/i }));
    expect(screen.getByRole('button', { name: /отвори хладилника/i })).toBeInTheDocument();
  });

  it('shows Bulgarian "Натисни за отваряне" hint when door is closed', () => {
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="bg" />);
    expect(screen.getByText(/натисни за отваряне/i)).toBeInTheDocument();
  });

  it('hides the hint when door is open', async () => {
    const user = userEvent.setup();
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="bg" />);
    await user.click(screen.getByRole('button', { name: /отвори хладилника/i }));
    expect(screen.queryByText(/натисни за отваряне/i)).not.toBeInTheDocument();
  });

  it('shows Bulgarian "Вратата е затворена" status by default', () => {
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="bg" />);
    expect(screen.getByText(/вратата е затворена/i)).toBeInTheDocument();
  });

  it('shows Bulgarian "Вратата е отворена" status when door is open', async () => {
    const user = userEvent.setup();
    render(<InteractiveFridge items={[]} onRemove={vi.fn()} onAddSlot={vi.fn()} lang="bg" />);
    await user.click(screen.getByRole('button', { name: /отвори хладилника/i }));
    expect(screen.getByText(/вратата е отворена/i)).toBeInTheDocument();
  });
});

describe('InteractiveFridge – status badges', () => {
  const allergyItem = makeItem({ id: 'a1', name: 'Peanuts', category: 'other' });
  const dislikedItem = makeItem({ id: 'd1', name: 'Broccoli', category: 'veg' });
  const normalItem   = makeItem({ id: 'n1', name: 'Milk', category: 'dairy' });

  const statusMap = new Map<string, 'disliked' | 'allergic'>([
    ['peanuts', 'allergic'],
    ['broccoli', 'disliked'],
  ]);

  it('renders the ! badge for an allergic item', () => {
    const { container } = render(
      <InteractiveFridge
        items={[allergyItem]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
        productStatusByName={statusMap}
      />,
    );
    expect(container.querySelector('.product.status-allergic .p-status')).not.toBeNull();
  });

  it('renders the – badge for a disliked item', () => {
    const { container } = render(
      <InteractiveFridge
        items={[dislikedItem]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
        productStatusByName={statusMap}
      />,
    );
    expect(container.querySelector('.product.status-disliked .p-status')).not.toBeNull();
  });

  it('renders no status badge for a normal item', () => {
    const { container } = render(
      <InteractiveFridge
        items={[normalItem]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
        productStatusByName={statusMap}
      />,
    );
    expect(container.querySelector('.p-status')).toBeNull();
  });

  it('shows a popover with the full name and status label when the badge is clicked', async () => {
    const user = userEvent.setup();
    render(
      <InteractiveFridge
        items={[allergyItem]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
        productStatusByName={statusMap}
      />,
    );
    await user.click(screen.getByRole('button', { name: /peanuts: allergic/i }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(within(tooltip).getByText('Peanuts')).toBeInTheDocument();
    expect(within(tooltip).getByText('Allergic')).toBeInTheDocument();
  });

  it('shows the correct description for a disliked item popover', async () => {
    const user = userEvent.setup();
    render(
      <InteractiveFridge
        items={[dislikedItem]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
        productStatusByName={statusMap}
      />,
    );
    await user.click(screen.getByRole('button', { name: /broccoli: disliked/i }));
    expect(screen.getByText('Disliked')).toBeInTheDocument();
    expect(screen.getByText(/You marked this as disliked/i)).toBeInTheDocument();
  });

  it('does not trigger onToggleSelect when the status badge is clicked', async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    render(
      <InteractiveFridge
        items={[allergyItem]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
        productStatusByName={statusMap}
        onToggleSelect={onToggleSelect}
      />,
    );
    await user.click(screen.getByRole('button', { name: /peanuts: allergic/i }));
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('shows the popover and calls onToggleSelect when tapping the card (not the badge)', async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    const { container } = render(
      <InteractiveFridge
        items={[allergyItem]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
        productStatusByName={statusMap}
        onToggleSelect={onToggleSelect}
      />,
    );
    const card = container.querySelector('.product') as HTMLElement;
    await user.click(card);
    expect(onToggleSelect).toHaveBeenCalledWith('a1');
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('includes status in the title attribute for desktop hover', () => {
    const { container } = render(
      <InteractiveFridge
        items={[allergyItem, dislikedItem, normalItem]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
        productStatusByName={statusMap}
      />,
    );
    const products = container.querySelectorAll('.product');
    const titles = Array.from(products).map(p => p.getAttribute('title'));
    expect(titles).toContain('Peanuts — Allergic ⚠');
    expect(titles).toContain('Broccoli — Disliked');
    expect(titles).toContain('Milk');
  });

  it('dismisses the popover when clicking elsewhere', async () => {
    const user = userEvent.setup();
    render(
      <InteractiveFridge
        items={[allergyItem]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
        productStatusByName={statusMap}
      />,
    );
    await user.click(screen.getByRole('button', { name: /peanuts: allergic/i }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.click(screen.getByTestId('popover-backdrop'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('dismisses the popover when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(
      <InteractiveFridge
        items={[allergyItem]}
        onRemove={vi.fn()}
        onAddSlot={vi.fn()}
        lang="en"
        productStatusByName={statusMap}
      />,
    );
    await user.click(screen.getByRole('button', { name: /peanuts: allergic/i }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
