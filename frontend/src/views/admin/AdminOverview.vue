<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { adminApi } from '@/api/admin';
import { challengeApi } from '@/api/challenges';
import { errorMessage } from '@/api/http';
import type { Challenge } from '@/api/types';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { formatDeadline, formatPeriod } from '@/utils/format';

const stats = ref<Record<string, number> | null>(null);
const current = ref<{ challenge: Challenge; participantCount: number } | null>(null);
const error = ref<string | null>(null);

const labels: Record<string, string> = {
  users: 'Benutzer',
  submissions: 'Fotos',
  comments: 'Kommentare',
  challenges: 'Challenges',
};

onMounted(async () => {
  try {
    const [s, c] = await Promise.all([adminApi.stats(), challengeApi.current()]);
    stats.value = s.stats;
    current.value = c;
  } catch (err) {
    error.value = errorMessage(err);
  }
});
</script>

<template>
  <div class="space-y-10">
    <AlertMessage v-if="error">{{ error }}</AlertMessage>

    <dl v-if="stats" class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div v-for="(value, key) in stats" :key="key" class="rounded-2xl border border-line bg-surface p-5">
        <dt class="label-caps">{{ labels[key] ?? key }}</dt>
        <dd class="mt-2 font-mono text-3xl tabular-nums">{{ value }}</dd>
      </div>
    </dl>

    <section v-if="current" class="rounded-2xl border border-line bg-surface p-6">
      <p class="label-caps">Aktuelle Challenge · {{ formatPeriod(current.challenge.period) }}</p>
      <h2 class="mt-2 text-2xl font-semibold">{{ current.challenge.title }}</h2>
      <p class="mt-1 text-muted">{{ current.challenge.description }}</p>
      <p v-if="current.challenge.twist" class="mt-2 text-sm">Twist: {{ current.challenge.twist }}</p>
      <p class="mt-4 font-mono text-xs text-muted">
        {{ current.participantCount }} Einsendungen · Frist {{ formatDeadline(current.challenge.deadline) }} Uhr
      </p>
      <BaseButton :to="{ name: 'admin-challenges' }" variant="secondary" size="sm" class="mt-5">Challenges verwalten</BaseButton>
    </section>
  </div>
</template>
