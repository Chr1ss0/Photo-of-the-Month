<script setup lang="ts">
import { computed } from 'vue';
import type { Exif } from '@/api/types';
import {
  formatAperture,
  formatCamera,
  formatCoords,
  formatEv,
  formatFocal,
  formatShutter,
  osmUrl,
} from '@/utils/format';

const props = defineProps<{ exif: Exif }>();

const primary = computed(() => [
  { key: 'aperture', label: 'Blende', value: formatAperture(props.exif.aperture) },
  { key: 'shutter', label: 'Verschluss', value: formatShutter(props.exif.exposureTime) },
  { key: 'iso', label: 'ISO', value: props.exif.iso === null ? null : String(props.exif.iso) },
  { key: 'ev', label: 'Belichtung', value: formatEv(props.exif.exposureBias) },
  { key: 'wb', label: 'Weißabgleich', value: props.exif.whiteBalance },
  { key: 'focal', label: 'Brennweite', value: formatFocal(props.exif.focalLength) },
]);

const camera = computed(() => formatCamera(props.exif.cameraMake, props.exif.cameraModel));
const coords = computed(() => formatCoords(props.exif.gpsLat, props.exif.gpsLon));
const mapUrl = computed(() => osmUrl(props.exif.gpsLat, props.exif.gpsLon));
const takenAt = computed(() => {
  const t = props.exif.takenAt;
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
});

const hasAny = computed(
  () => primary.value.some((p) => p.value) || camera.value || props.exif.lens || coords.value || takenAt.value,
);
</script>

<template>
  <section
    class="@container overflow-hidden rounded-2xl border border-line bg-surface"
    aria-label="Aufnahmedaten"
    data-testid="exif-box"
  >
    <header class="flex items-center justify-between border-b border-line px-5 py-3">
      <p class="label-caps flex items-center gap-2">
        <span class="size-1.5 animate-pulse rounded-full bg-accent" />Aufnahmedaten
      </p>
      <p v-if="camera" class="truncate font-mono text-xs text-muted">{{ camera }}</p>
    </header>

    <div v-if="!hasAny" class="px-5 py-6 text-sm text-muted">
      Keine EXIF-Daten im Bild gefunden.
    </div>

    <template v-else>
      <!-- gap-px auf Linienfarbe ergibt saubere Trennlinien in jedem Layout -->
      <dl class="grid grid-cols-2 gap-px bg-line @lg:grid-cols-3 @4xl:grid-cols-6">
        <div v-for="item in primary" :key="item.key" class="min-w-0 bg-surface px-5 py-4">
          <dt class="label-caps truncate">{{ item.label }}</dt>
          <dd class="mt-1 truncate font-mono text-lg tabular-nums" :class="item.value ? 'text-ink' : 'text-muted/50'" :title="item.value ?? undefined">
            {{ item.value ?? '—' }}
          </dd>
        </div>
      </dl>

      <dl
        v-if="exif.lens || coords || takenAt"
        class="grid gap-x-8 gap-y-3 border-t border-line bg-surface-2/50 px-5 py-4 text-sm @2xl:grid-cols-2"
      >
        <div v-if="exif.lens" class="flex gap-3">
          <dt class="label-caps w-20 shrink-0 pt-0.5">Objektiv</dt>
          <dd class="font-mono text-xs leading-5">{{ exif.lens }}</dd>
        </div>
        <div v-if="takenAt" class="flex gap-3">
          <dt class="label-caps w-20 shrink-0 pt-0.5">Aufnahme</dt>
          <dd class="font-mono text-xs leading-5">{{ takenAt }}</dd>
        </div>
        <div v-if="coords" class="flex gap-3 @2xl:col-span-2">
          <dt class="label-caps w-20 shrink-0 pt-0.5">GPS</dt>
          <dd class="font-mono text-xs leading-5">
            <a
              v-if="mapUrl"
              :href="mapUrl"
              target="_blank"
              rel="noopener noreferrer nofollow"
              class="underline decoration-line underline-offset-4 hover:decoration-accent"
            >
              {{ coords }} ↗
            </a>
          </dd>
        </div>
      </dl>
    </template>
  </section>
</template>
