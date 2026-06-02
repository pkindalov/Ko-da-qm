import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CookingMode } from './CookingMode';

const makeProps = (overrides: Partial<Parameters<typeof CookingMode>[0]> = {}) => ({
  name: 'Pasta',
  steps: ['Boil water for 10 minutes', 'Add pasta', 'Drain and serve'],
  ingredients: ['pasta', 'salt', 'water'],
  time: 20,
  isEnglish: true,
  onClose: vi.fn(),
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CookingMode – navigation', () => {
  it('opens on the first step with the right counter and text', () => {
    render(<CookingMode {...makeProps()} />);
    const counter = screen.getByText('1', { selector: '.cook-counter b' });
    expect(counter).toBeInTheDocument();
    expect(screen.getByText('Boil water for 10 minutes')).toBeInTheDocument();
  });

  it('advances to the next step with Next', async () => {
    const user = userEvent.setup();
    render(<CookingMode {...makeProps()} />);
    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Add pasta')).toBeInTheDocument();
  });

  it('goes back with Back', async () => {
    const user = userEvent.setup();
    render(<CookingMode {...makeProps()} />);
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.getByText('Boil water for 10 minutes')).toBeInTheDocument();
  });

  it('disables Back on the first step', () => {
    render(<CookingMode {...makeProps()} />);
    expect(screen.getByRole('button', { name: /Back/i })).toBeDisabled();
  });

  it('shows Finish on the last step and closes when clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CookingMode {...makeProps({ onClose })} />);
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Finish/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('CookingMode – exit confirmation', () => {
  it('closes directly from the first step without confirming', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CookingMode {...makeProps({ onClose })} />);
    await user.click(screen.getByRole('button', { name: /Close cooking mode/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks to confirm when leaving past the first step', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CookingMode {...makeProps({ onClose })} />);
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Close cooking mode/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Keep cooking dismisses the confirm without closing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CookingMode {...makeProps({ onClose })} />);
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Close cooking mode/i }));
    await user.click(screen.getByRole('button', { name: /Keep cooking/i }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Leave confirms the exit', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CookingMode {...makeProps({ onClose })} />);
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Close cooking mode/i }));
    await user.click(screen.getByRole('button', { name: 'Leave' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not let arrow keys navigate steps behind the open confirm', () => {
    const onClose = vi.fn();
    render(<CookingMode {...makeProps({ onClose })} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // -> step 2
    fireEvent.keyDown(window, { key: 'Escape' }); // opens confirm (past first step)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // must be swallowed by the modal
    expect(screen.getByText('2', { selector: '.cook-counter b' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('CookingMode – layout switcher', () => {
  it('offers all four layouts', () => {
    render(<CookingMode {...makeProps()} />);
    ['Text', 'Timer', 'Cards', 'Split'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('switches to the split layout showing the ingredient list', async () => {
    const user = userEvent.setup();
    render(<CookingMode {...makeProps()} />);
    await user.click(screen.getByRole('button', { name: 'Split' }));
    expect(screen.getByText('Ingredients')).toBeInTheDocument();
    expect(screen.getByText('pasta')).toBeInTheDocument();
  });

  it('switches to the timer-ring layout', async () => {
    const user = userEvent.setup();
    render(<CookingMode {...makeProps()} />);
    await user.click(screen.getByRole('button', { name: 'Timer' }));
    // Step 1 has a 10-minute duration, so the ring is ready to start.
    expect(screen.getByText('10m')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });
});

describe('CookingMode – step timer', () => {
  it('starts and counts down the timer for a timed step', () => {
    vi.useFakeTimers();
    render(<CookingMode {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: /Start timer/i }));
    expect(screen.getByText('10:00')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('9:57')).toBeInTheDocument();
  });

  it('shows no timer chip on a step without a duration', async () => {
    const user = userEvent.setup();
    render(<CookingMode {...makeProps()} />);
    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.queryByRole('button', { name: /Start timer/i })).not.toBeInTheDocument();
  });
});

describe('CookingMode – wake lock', () => {
  it('does not show the wake badge when the API is unsupported (jsdom)', () => {
    render(<CookingMode {...makeProps()} />);
    expect(screen.queryByText(/Screen/i)).not.toBeInTheDocument();
  });
});
