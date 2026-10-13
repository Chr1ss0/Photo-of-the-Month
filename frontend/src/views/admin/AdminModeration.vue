<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { adminApi } from '@/api/admin';
import { errorMessage } from '@/api/http';
import { submissionApi } from '@/api/submissions';
import type { AdminComment, AdminSubmission } from '@/api/types';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { formatDateTime, formatPeriod } from '@/utils/format';

const toast = useToast();
const tab = ref<'photos' | 'comments'>('photos');
const submissions = ref<AdminSubmission[]>([]);
const comments = ref<AdminComment[]>([]);
const error = ref<string | null>(null);
const pending = ref<{ type: 'photo' | 'comment'; id: number } | null>(null);
const busy = ref(false);

async function load() {
  try {
    const [s, c] = await Promise.all([adminApi.submissions(), adminApi.comments()]);
    submissions.value = s.submissions;
    comments.value = c.comments;
  } catch (err) {
    error.value = errorMessage(err);
  }
}

async function confirm() {
  if (!pending.value) return;
  busy.value = true;
  const { type, id } = pending.value;
  try {
    if (type === 'photo') {
      await submissionApi.remove(id);
      submissions.value = submissions.value.filter((s) => s.id !== id);
    } else {
      await submissionApi.deleteComment(id);
      comments.value = comments.value.filter((c) => c.id !== id);
    }
    toast.success('Entfernt');
    pending.value = null;
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <AlertMessage v-if="error">{{ error }}</AlertMessage>
    <div class="mb-6 inline-flex rounded-full border border-line p-1 text-sm">
      <button
        v-for="t in [{ k: 'photos', l: `Fotos (${submissions.length})` }, { k: 'comments', l: `Kommentare (${comments.length})` }] as const"
        :key="t.k"
        type="button"
        class="rounded-full px-4 py-1.5"
        :class="tab === t.k ? 'bg-ink text-canvas' : 'text-muted hover:text-ink'"
        @click="tab = t.k"
      >
        {{ t.l }}
      </button>
    </div>

    <ul v-if="tab === 'photos'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="s in submissions" :key="s.id" class="flex gap-4 rounded-2xl border border-line bg-surface p-3">
        <RouterLink :to="{ name: 'photo', params: { id: s.id } }" class="shrink-0">
          <img :src="s.thumbUrl" :alt="s.description || s.challengeTitle" loading="lazy" class="size-20 rounded-lg object-cover" />
        </RouterLink>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ s.user.username }}</p>
          <p class="truncate text-xs text-muted">{{ formatPeriod(s.period) }} · {{ s.challengeTitle }}</p>
          <p class="mt-1 line-clamp-2 text-xs text-muted">{{ s.description }}</p>
          <BaseButton size="sm" variant="ghost" class="-ml-3" @click="pending = { type: 'photo', id: s.id }">Entfernen</BaseButton>
        </div>
      </li>
    </ul>

    <ul v-else class="divide-y divide-line rounded-2xl border border-line bg-surface">
      <li v-for="c in comments" :key="c.id" class="flex items-start justify-between gap-4 p-4">
        <div class="min-w-0">
          <p class="text-xs text-muted">
            <span class="font-medium text-ink">{{ c.user.username }}</span> · {{ formatDateTime(c.createdAt) }} ·
            <RouterLink :to="{ name: 'photo', params: { id: c.submissionId } }" class="underline underline-offset-2">Foto #{{ c.submissionId }}</RouterLink>
          </p>
          <p class="mt-1 text-sm break-words whitespace-pre-line">{{ c.body }}</p>
        </div>
        <BaseButton size="sm" variant="ghost" @click="pending = { type: 'comment', id: c.id }">Löschen</BaseButton>
      </li>
    </ul>

    <ConfirmDialog
      :open="pending !== null"
      :title="pending?.type === 'photo' ? 'Foto entfernen?' : 'Kommentar löschen?'"
      confirm-label="Entfernen"
      :loading="busy"
      @confirm="confirm"
      @cancel="pending = null"
    >
      Diese Aktion kann nicht rückgängig gemacht werden.
    </ConfirmDialog>
  </div>
</template>
