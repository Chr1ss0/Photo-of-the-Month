<script setup lang="ts">
import type { GalleryMonth } from '@/api/types';
import { formatPeriod } from '@/utils/format';
import PhotoCard from './PhotoCard.vue';

defineProps<{ month: GalleryMonth; linkTitle?: boolean }>();
</script>

<template>
  <section :aria-labelledby="`month-${month.challenge.period}`" class="scroll-mt-24">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        <p class="label-caps">{{ formatPeriod(month.challenge.period) }}</p>
        <h2 :id="`month-${month.challenge.period}`" class="mt-1 text-2xl font-semibold tracking-tight">
          <RouterLink
            v-if="linkTitle"
            :to="{ name: 'gallery-month', params: { period: month.challenge.period } }"
            class="hover:text-accent"
          >
            {{ month.challenge.title }}
          </RouterLink>
          <template v-else>{{ month.challenge.title }}</template>
        </h2>
        <p v-if="month.challenge.twist" class="mt-1 text-sm text-muted">Twist: {{ month.challenge.twist }}</p>
      </div>
      <p class="font-mono text-xs text-muted">
        {{ month.submissions.length }} {{ month.submissions.length === 1 ? 'Teilnehmer' : 'Teilnehmende' }}
      </p>
    </header>
    <div class="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      <PhotoCard v-for="s in month.submissions" :key="s.id" :submission="s" />
    </div>
  </section>
</template>
