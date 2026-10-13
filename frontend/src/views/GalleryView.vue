<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { galleryApi } from '@/api/gallery';
import { errorMessage } from '@/api/http';
import type { GalleryMonth } from '@/api/types';
import PageHeader from '@/components/layout/PageHeader.vue';
import GalleryMonthSection from '@/components/photo/GalleryMonthSection.vue';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { formatPeriod } from '@/utils/format';

const PAGE = 4;
const months = ref<GalleryMonth[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const loaded = ref(false);

async function loadMore() {
  loading.value = true;
  try {
    const res = await galleryApi.list(PAGE, months.value.length);
    months.value.push(...res.months);
    total.value = res.total;
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
    loaded.value = true;
  }
}

onMounted(loadMore);
</script>

<template>
  <div>
    <PageHeader eyebrow="Archiv" title="Galerie" subtitle="Alle abgeschlossenen Challenges – Monat für Monat." />

    <!-- Monatsnavigation als Filmstreifen -->
    <nav v-if="months.length > 1" class="-mx-5 mb-12 overflow-x-auto px-5" aria-label="Monate">
      <ul class="flex gap-2">
        <li v-for="m in months" :key="m.challenge.period">
          <RouterLink
            :to="{ hash: `#month-${m.challenge.period}` }"
            class="block rounded-full border border-line px-4 py-1.5 font-mono text-xs whitespace-nowrap text-muted hover:border-ink hover:text-ink"
          >
            {{ formatPeriod(m.challenge.period) }}
          </RouterLink>
        </li>
      </ul>
    </nav>

    <AlertMessage v-if="error">{{ error }}</AlertMessage>
    <EmptyState
      v-else-if="loaded && months.length === 0"
      title="Noch keine Fotos in der Galerie"
      text="Sobald die erste Challenge abgelaufen ist, erscheinen hier alle Einsendungen."
    >
      <BaseButton to="/" variant="secondary">Zur aktuellen Challenge</BaseButton>
    </EmptyState>

    <div class="space-y-20">
      <GalleryMonthSection v-for="m in months" :key="m.challenge.period" :month="m" link-title />
    </div>

    <div v-if="months.length < total" class="mt-16 flex justify-center">
      <BaseButton variant="secondary" :loading="loading" @click="loadMore">Ältere Monate laden</BaseButton>
    </div>
  </div>
</template>
