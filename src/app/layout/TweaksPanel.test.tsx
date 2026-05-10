import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TweaksPanel } from './TweaksPanel';
import type { Tweaks } from '../../shared/types';

const baseTweaks: Tweaks = { theme: 'warm', lang: 'en', showEmoji: true };

const renderPanel = (tweaks: Tweaks = baseTweaks, onClose = vi.fn()) =>
  render(<TweaksPanel open tweaks={tweaks} setTweaks={vi.fn()} onClose={onClose} />);

describe('TweaksPanel close button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a close button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /close settings/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    renderPanel(baseTweaks, onClose);
    await userEvent.click(screen.getByRole('button', { name: /close settings/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('TweaksPanel language labels', () => {
  it('shows english labels when lang is en', () => {
    renderPanel({ ...baseTweaks, lang: 'en' });
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('shows bulgarian labels when lang is bg', () => {
    renderPanel({ ...baseTweaks, lang: 'bg' });
    expect(screen.getByText(/настройки/i)).toBeInTheDocument();
    expect(screen.getByText('Тема')).toBeInTheDocument();
    expect(screen.getByText('Език')).toBeInTheDocument();
  });

  it('shows english theme names when lang is en', () => {
    renderPanel({ ...baseTweaks, lang: 'en' });
    expect(screen.getByRole('button', { name: /warm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cool/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument();
  });

  it('shows bulgarian theme names when lang is bg', () => {
    renderPanel({ ...baseTweaks, lang: 'bg' });
    expect(screen.getByRole('button', { name: /топло/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /хладно/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /тъмно/i })).toBeInTheDocument();
  });
});

describe('TweaksPanel interactions', () => {
  it('calls setTweaks with new theme when theme button is clicked', async () => {
    const setTweaks = vi.fn();
    render(<TweaksPanel open tweaks={baseTweaks} setTweaks={setTweaks} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /dark/i }));
    expect(setTweaks).toHaveBeenCalledWith({ ...baseTweaks, theme: 'dark' });
  });

  it('calls setTweaks with bg lang when БГ button is clicked', async () => {
    const setTweaks = vi.fn();
    render(<TweaksPanel open tweaks={baseTweaks} setTweaks={setTweaks} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'БГ' }));
    expect(setTweaks).toHaveBeenCalledWith({ ...baseTweaks, lang: 'bg' });
  });

  it('calls setTweaks with en lang when EN button is clicked', async () => {
    const setTweaks = vi.fn();
    render(<TweaksPanel open tweaks={{ ...baseTweaks, lang: 'bg' }} setTweaks={setTweaks} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(setTweaks).toHaveBeenCalledWith({ ...baseTweaks, lang: 'en' });
  });
});
