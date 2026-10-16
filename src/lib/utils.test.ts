import { describe, it, expect } from 'vitest';
import { formatDoseAmount, parseDoseAmount } from './utils';

describe('formatDoseAmount', () => {
  it('formats standard decimal fractions into human fractions', () => {
    expect(formatDoseAmount(0.5)).toBe('1/2');
    expect(formatDoseAmount(0.25)).toBe('1/4');
    expect(formatDoseAmount(0.75)).toBe('3/4');
    expect(formatDoseAmount(0.125)).toBe('1/8');
    expect(formatDoseAmount(0.33)).toBe('1/3');
    expect(formatDoseAmount(0.67)).toBe('2/3');
  });

  it('formats mixed numbers with fractions', () => {
    expect(formatDoseAmount(1.5)).toBe('1 1/2');
    expect(formatDoseAmount(1.25)).toBe('1 1/4');
    expect(formatDoseAmount(2.75)).toBe('2 3/4');
    expect(formatDoseAmount(2.5)).toBe('2 1/2');
  });

  it('formats whole numbers cleanly without decimals', () => {
    expect(formatDoseAmount(1)).toBe('1');
    expect(formatDoseAmount(2)).toBe('2');
    expect(formatDoseAmount(10)).toBe('10');
    expect(formatDoseAmount(50)).toBe('50');
  });

  it('handles null, undefined, empty', () => {
    expect(formatDoseAmount(null)).toBe('');
    expect(formatDoseAmount(undefined)).toBe('');
    expect(formatDoseAmount('')).toBe('');
  });
});

describe('parseDoseAmount', () => {
  it('parses fraction strings into numbers', () => {
    expect(parseDoseAmount('1/2')).toBe(0.5);
    expect(parseDoseAmount('1/4')).toBe(0.25);
    expect(parseDoseAmount('3/4')).toBe(0.75);
    expect(parseDoseAmount('1 1/2')).toBe(1.5);
    expect(parseDoseAmount('2 1/4')).toBe(2.25);
  });

  it('parses decimals with dot or comma', () => {
    expect(parseDoseAmount('0.5')).toBe(0.5);
    expect(parseDoseAmount('0,25')).toBe(0.25);
    expect(parseDoseAmount('1.75')).toBe(1.75);
    expect(parseDoseAmount('2')).toBe(2);
    expect(parseDoseAmount(0.5)).toBe(0.5);
  });
});
