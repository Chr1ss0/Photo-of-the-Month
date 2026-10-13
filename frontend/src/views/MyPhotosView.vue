<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { errorMessage } from '@/api/http';
import { submissionApi } from '@/api/submissions';
import type { Submission } from '@/api/types';
import PageHeader from '@/components/layout/PageHeader.vue';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { formatAperture, formatIso, formatPeriod, formatShutter } from '@/utils/format';

const submissions = ref<Submission[]>([]);
const loaded = ref(false);
const error = ref<string | null>(null);

const stats = computed(() => ({
  total: submissions.value.length,
  comments: submissions.value.reduce((n, s) => n + s.commentCount, 0),
}));

onMounted(async () => {
  try {
    submissions.value = (await submissionApi.mine()).submissions;
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    loaded.value = true;
  }
});
</script>

<template>
  <div>
    <PageHeader eyebrow="Portfolio" title="Meine Fotos" subtitle="Alle deine Einsendungen auf einen Blick.">
      <template #actions>
        <div v-if="stats.total" class="flex gap-6 font-mono text-sm">
          <div><span class="block text-2xl">{{ stats.total }}</span><span class="label-caps">Fotos</span></div>
          <div><span class="block text-2xl">{{ stats.comments }}</span><span class="label-caps">Kommentare</span></div>
        </div>
      </template>
    </PageHeader>

    <AlertMessage v-if="error">{{ error }}</AlertMessage>
    <EmptyState v-else-if="loaded && !submissions.length" title="Noch keine Einsendungen" text="Mach mit bei der aktuellen Challenge!">
      <BaseButton to="/" variant="accent">Zur Challenge</BaseButton>
    </EmptyState>

    <ol class="space-y-4">
      <li v-for="s in submissions" :key="s.id">
        <RouterLink
          :to="{ name: 'photo', params: { id: s.id } }"
          class="group grid grid-cols-[6rem_1fr] items-center gap-5 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-ink/30 sm:grid-cols-[8rem_1fr_auto]"
        >
          <img :src="s.thumbUrl" :alt="s.description || s.challenge.title" loading="lazy" class="aspect-square w-full rounded-xl object-cover" />
          <div class="min-w-0">
            <p class="label-caps">{{ formatPeriod(s.challenge.period) }}</p>
            <p class="mt-1 truncate text-lg font-medium group-hover:text-accent">{{ s.challenge.title }}</p>
            <p v-if="s.description" class="mt-1 line-clamp-2 text-sm text-muted">{{ s.description }}</p>
            <p class="mt-2 flex gap-3 font-mono text-xs text-muted">
              <span v-if="s.exif.aperture">{{ formatAperture(s.exif.aperture) }}</span>
              <span v-if="s.exif.exposureTime">{{ formatShutter(s.exif.exposureTime) }}</span>
              <span v-if="s.exif.iso">{{ formatIso(s.exif.iso) }}</span>
              <span>{{ s.commentCount }} Kommentar{{ s.commentCount === 1 ? '' : 'e' }}</span>
            </p>
          </div>
          <span
            class="col-span-2 justify-self-start rounded-full px-3 py-1 font-mono text-[0.65rem] tracking-wider uppercase sm:col-span-1 sm:justify-self-end"
            :class="s.isOpen ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-muted'"
          >
            {{ s.isOpen ? 'Läuft · austauschbar' : 'In der Galerie' }}
          </span>
        </RouterLink>
      </li>
    </ol>
  </div>
</template>
