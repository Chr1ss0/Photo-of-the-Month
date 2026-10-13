import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CommentItem from './photo/CommentItem.vue';
import ExifInfoBox from './photo/ExifInfoBox.vue';
import type { Exif } from '@/api/types';

const XSS = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>';

const exif: Exif = {
  aperture: 2.8,
  exposureTime: 0.004,
  iso: 400,
  whiteBalance: 'Manuell · Tageslicht',
  exposureBias: -0.33,
  gpsLat: 52.52,
  gpsLon: 13.405,
  focalLength: 35,
  cameraMake: 'Fujifilm',
  cameraModel: 'X-T5',
  lens: null,
  takenAt: '2026-10-01T18:30:00',
};

describe('XSS-Schutz in Komponenten', () => {
  it('rendert Kommentartext als Text, nicht als HTML', () => {
    const w = mount(CommentItem, {
      props: {
        comment: { id: 1, body: XSS, createdAt: new Date().toISOString(), user: { id: 1, username: '<b>x</b>' }, canDelete: false },
      },
    });
    const body = w.get('[data-testid=comment-body]');
    expect(body.text()).toBe(XSS);
    expect(body.element.querySelector('img, script')).toBeNull();
    expect(w.html()).not.toContain('<b>x</b>');
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it('escaped manipulierte EXIF-Strings (Kamera, Objektiv, Weißabgleich)', () => {
    const w = mount(ExifInfoBox, {
      props: { exif: { ...exif, cameraMake: XSS, cameraModel: null, lens: XSS, whiteBalance: XSS } },
    });
    expect(w.element.querySelector('img, script')).toBeNull();
    expect(w.text()).toContain('<script>');
  });
});

describe('ExifInfoBox', () => {
  it('zeigt Blende, Verschlusszeit, ISO, Weißabgleich, EV und GPS', () => {
    const w = mount(ExifInfoBox, { props: { exif } });
    const text = w.text();
    for (const expected of ['ƒ/2.8', '1/250 s', '400', 'Manuell · Tageslicht', '−1/3 EV', '35 mm', '52,5200° N']) {
      expect(text).toContain(expected);
    }
    const link = w.get('a');
    expect(link.attributes('href')).toMatch(/^https:\/\/www\.openstreetmap\.org\//);
    expect(link.attributes('rel')).toContain('noopener');
  });

  it('zeigt einen Hinweis, wenn keine EXIF-Daten vorhanden sind', () => {
    const empty = Object.fromEntries(Object.keys(exif).map((k) => [k, null])) as unknown as Exif;
    const w = mount(ExifInfoBox, { props: { exif: empty } });
    expect(w.text()).toContain('Keine EXIF-Daten');
  });
});
