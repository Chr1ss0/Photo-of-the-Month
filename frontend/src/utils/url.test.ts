import { describe, expect, it } from 'vitest';
import { safeRedirect } from './url';

describe('safeRedirect (Open-Redirect-Schutz)', () => {
  it('erlaubt interne Pfade', () => {
    expect(safeRedirect('/galerie')).toBe('/galerie');
    expect(safeRedirect('/foto/12?x=1#c')).toBe('/foto/12?x=1#c');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/\tjavascript:alert(1)',
    '',
    undefined,
    ['/admin'],
  ])('blockiert %s', (target) => {
    expect(safeRedirect(target)).toBe('/');
  });
});
