<script setup lang="ts">
import type { Submission } from '@/api/types';
import { formatAperture, formatIso, formatShutter } from '@/utils/format';

defineProps<{ submission: Submission; showChallenge?: boolean }>();
</script>

<template>
  <RouterLink
    :to="{ name: 'photo', params: { id: submission.id } }"
    class="group block focus-visible:outline-offset-4"
    :aria-label="`Foto von ${submission.user.username} öffnen`"
  >
    <div class="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-2">
      <img
        :src="submission.thumbUrl"
        :alt="submission.description || `Foto von ${submission.user.username}`"
        loading="lazy"
        decoding="async"
        class="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
      <!-- Sucher-Overlay beim Hover -->
      <div
        class="pointer-events-none absolute inset-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      >
        <span class="absolute top-0 left-0 size-4 border-t border-l border-white/80" />
        <span class="absolute top-0 right-0 size-4 border-t border-r border-white/80" />
        <span class="absolute bottom-0 left-0 size-4 border-b border-l border-white/80" />
        <span class="absolute right-0 bottom-0 size-4 border-r border-b border-white/80" />
        <span class="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white/60" />
      </div>
      <div
        class="absolute inset-x-0 bottom-0 flex gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-3 font-mono text-[0.68rem] text-white/90 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <span v-if="submission.exif.aperture">{{ formatAperture(submission.exif.aperture) }}</span>
        <span v-if="submission.exif.exposureTime">{{ formatShutter(submission.exif.exposureTime) }}</span>
        <span v-if="submission.exif.iso">{{ formatIso(submission.exif.iso) }}</span>
      </div>
      <span
        v-if="submission.isOpen"
        class="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[0.6rem] tracking-wider text-white uppercase backdrop-blur"
      >
        Läuft noch
      </span>
    </div>
    <div class="mt-3 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate text-sm font-medium">{{ submission.user.username }}</p>
        <p v-if="showChallenge" class="truncate text-xs text-muted">{{ submission.challenge.title }}</p>
      </div>
      <span v-if="submission.commentCount" class="flex shrink-0 items-center gap-1 font-mono text-xs text-muted">
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        </svg>
        {{ submission.commentCount }}
      </span>
    </div>
  </RouterLink>
</template>
