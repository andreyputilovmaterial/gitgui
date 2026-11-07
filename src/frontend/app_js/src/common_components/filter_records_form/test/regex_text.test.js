
import { describe, it, expect } from 'vitest';
import match from '../match/regex_text.js';

describe('regex_text matcher', () => {
  it('empty value matches everything', () => {
    expect(match('anything', '')).toBe(true);
    expect(match('anything', { text: '', regex: true })).toBe(true);
  });

  it('substring match is case-insensitive when regex is off', () => {
    expect(match('Hello World', { text: 'hello', regex: false })).toBe(true);
    expect(match('Hello World', 'hello')).toBe(true); // plain-string fallback
    expect(match('Hello World', { text: 'nope', regex: false })).toBe(false);
  });

  it('regex match is case-sensitive', () => {
    expect(match('file123.txt', { text: '^file\\d+\\.txt$', regex: true })).toBe(true);
    expect(match('File123.txt', { text: '^file\\d+\\.txt$', regex: true })).toBe(false);
  });

  it('invalid regex matches nothing', () => {
    expect(match('anything', { text: '[unclosed', regex: true })).toBe(false);
  });
});
