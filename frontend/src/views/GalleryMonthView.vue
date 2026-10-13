<script setup lang="ts">
import { ref, watch } from 'vue';
import { galleryApi } from '@/api/gallery';
import { errorMessage } from '@/api/http';
import type { GalleryMonth } from '@/api/types';
import GalleryMonthSection from '@/components/photo/GalleryMonthSection.vue';
import AlertMessage from '@/components/ui/AlertMessage.vue';

const props = defineProps<{ period: string }>();
const month = ref<GalleryMonth | null>(null);
const error = ref<string | null>(null);

watch(
  () => props.period,
  async (p) => {
    month.value = null;
    error.value = null;
    try {
      month.value = await galleryApi.month(p);
    } catch (err) {
      error.value = errorMessage(err);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div>
    <RouterLink to="/galerie" class="mb-8 inline-block text-sm text-muted hover:text-ink">← Zur Galerie</RouterLink>
    <AlertMessage v-if="error">{{ error }}</AlertMessage>
    <GalleryMonthSection v-else-if="month" :month="month" />
    <div v-else class="h-64 animate-pulse rounded-2xl bg-surface-2" />
  </div>
</template>
