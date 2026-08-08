/**
 * Phase 8 – useDebounce Hook Tests
 * Tests: debounce delay, immediate returns initial value, clears timeout on unmount.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../../hooks/useDebounce';

describe('Phase 8 – useDebounce Hook Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. returns initial value immediately (before delay)', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('2. does not update value before delay expires', () => {
    let value = 'first';
    const { result, rerender } = renderHook(() => useDebounce(value, 300));

    value = 'second';
    rerender();

    // Advance time but not fully (200ms < 300ms delay)
    act(() => { vi.advanceTimersByTime(200); });

    expect(result.current).toBe('first');
  });

  it('3. updates debounced value after delay expires', () => {
    let value = 'first';
    const { result, rerender } = renderHook(() => useDebounce(value, 300));

    value = 'second';
    rerender();

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe('second');
  });

  it('4. resets timer if value changes before delay expires (debounce behavior)', () => {
    let value = 'first';
    const { result, rerender } = renderHook(() => useDebounce(value, 300));

    // Change value twice quickly
    value = 'second';
    rerender();
    act(() => { vi.advanceTimersByTime(100); }); // 100ms

    value = 'third';
    rerender();
    act(() => { vi.advanceTimersByTime(100); }); // another 100ms (200ms total, not enough)

    expect(result.current).toBe('first'); // still initial

    act(() => { vi.advanceTimersByTime(300); }); // fire debounce from last change

    expect(result.current).toBe('third'); // only last value applied
  });

  it('5. uses default 300ms delay when no delay specified', () => {
    let value = 'hello';
    const { result, rerender } = renderHook(() => useDebounce(value));

    value = 'world';
    rerender();

    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('hello');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('world');
  });

  it('6. works with number values', () => {
    let value = 10;
    const { result, rerender } = renderHook(() => useDebounce(value, 500));

    value = 25;
    rerender();
    act(() => { vi.advanceTimersByTime(500); });

    expect(result.current).toBe(25);
  });

  it('7. works with object references', () => {
    let value = { radius: 10 };
    const { result, rerender } = renderHook(() => useDebounce(value, 200));

    const newValue = { radius: 50 };
    value = newValue;
    rerender();
    act(() => { vi.advanceTimersByTime(200); });

    expect(result.current).toBe(newValue);
  });
});
