<script setup lang="ts">
import type { Challenge } from '@/api/types';
import { formatPeriod } from '@/utils/format';
import CountdownDisplay from './CountdownDisplay.vue';

defineProps<{ challenge: Challenge; participantCount: number }>();
</script>

<template>
  <section class="relative overflow-hidden rounded-3xl border border-line bg-surface">
    <!-- dezentes Sucher-Raster -->
    <div class="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true">
      <div class="absolute inset-y-0 left-1/3 border-l border-ink" />
      <div class="absolute inset-y-0 left-2/3 border-l border-ink" />
      <div class="absolute inset-x-0 top-1/3 border-t border-ink" />
      <div class="absolute inset-x-0 top-2/3 border-t border-ink" />
    </div>

    <div class="relative grid gap-10 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p class="label-caps mb-4 flex items-center gap-2">
          <span class="relative flex size-2">
            <span class="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
            <span class="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          Challenge · {{ formatPeriod(challenge.period) }}
        </p>
        <h1 class="text-4xl font-semibold tracking-tight sm:text-6xl">{{ challenge.title }}</h1>
        <p v-if="challenge.description" class="mt-4 max-w-xl text-lg text-muted">{{ challenge.description }}</p>
        <div v-if="challenge.twist" class="mt-6 inline-flex max-w-xl items-start gap-3 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3">
          <span class="label-caps !text-accent mt-0.5 shrink-0">Twist</span>
          <span class="text-sm">{{ challenge.twist }}</span>
        </div>
        <p class="mt-6 font-mono text-xs text-muted">
          {{ participantCount }} {{ participantCount === 1 ? 'Einsendung' : 'Einsendungen' }} bisher
        </p>
      </div>
      <CountdownDisplay :deadline="challenge.deadline" />
    </div>
  </section>
</template>
