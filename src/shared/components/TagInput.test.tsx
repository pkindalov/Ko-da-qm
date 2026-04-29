import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TagInput } from './TagInput';

function Wrapper({ initial = [] }: { initial?: string[] }) {
  const [tags, setTags] = useState(initial);
  return <TagInput value={tags} onChange={setTags} placeholder="Добави" />;
}

describe('TagInput', () => {
  it('adds a tag when + button is clicked', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.type(screen.getByPlaceholderText('Добави'), 'яйца');
    await user.click(screen.getByRole('button', { name: '+' }));
    expect(screen.getByText(/яйца/)).toBeInTheDocument();
  });

  it('adds a tag when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.type(screen.getByPlaceholderText('Добави'), 'мляко{Enter}');
    expect(screen.getByText(/мляко/)).toBeInTheDocument();
  });

  it('trims and lowercases the input before adding', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.type(screen.getByPlaceholderText('Добави'), '  Яйца  ');
    await user.click(screen.getByRole('button', { name: '+' }));
    expect(screen.getByText(/яйца/)).toBeInTheDocument();
  });

  it('clears the input field after adding', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const input = screen.getByPlaceholderText('Добави');
    await user.type(input, 'масло');
    await user.click(screen.getByRole('button', { name: '+' }));
    expect(input).toHaveValue('');
  });

  it('does not call onChange for empty input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} placeholder="Добави" />);
    await user.click(screen.getByRole('button', { name: '+' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not add a duplicate tag', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={['яйца']} onChange={onChange} placeholder="Добави" />);
    await user.type(screen.getByPlaceholderText('Добави'), 'яйца');
    await user.click(screen.getByRole('button', { name: '+' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a tag when it is clicked', async () => {
    const user = userEvent.setup();
    render(<Wrapper initial={['яйца', 'масло']} />);
    await user.click(screen.getByText(/яйца/));
    expect(screen.queryByText(/яйца/)).not.toBeInTheDocument();
    expect(screen.getByText(/масло/)).toBeInTheDocument();
  });

  it('does not add a tag for whitespace-only input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} placeholder="Добави" />);
    await user.type(screen.getByPlaceholderText('Добави'), '   ');
    await user.click(screen.getByRole('button', { name: '+' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not add a tag that is a duplicate after normalisation', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={['яйца']} onChange={onChange} placeholder="Добави" />);
    await user.type(screen.getByPlaceholderText('Добави'), '  Яйца  ');
    await user.click(screen.getByRole('button', { name: '+' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
