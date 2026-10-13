<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { errorMessage } from '@/api/http';
import { submissionApi } from '@/api/submissions';
import type { Comment } from '@/api/types';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import { useToast } from '@/composables/useToast';
import CommentItem from './CommentItem.vue';

const props = defineProps<{ submissionId: number }>();
const emit = defineEmits<{ count: [n: number] }>();

const comments = ref<Comment[]>([]);
const body = ref('');
const loading = ref(true);
const sending = ref(false);
const error = ref<string | null>(null);
const toast = useToast();

async function load() {
  loading.value = true;
  try {
    comments.value = (await submissionApi.comments(props.submissionId)).comments;
    emit('count', comments.value.length);
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function send() {
  if (!body.value.trim()) return;
  sending.value = true;
  error.value = null;
  try {
    const { comment } = await submissionApi.addComment(props.submissionId, body.value);
    comments.value.push(comment);
    emit('count', comments.value.length);
    body.value = '';
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    sending.value = false;
  }
}

async function remove(id: number) {
  try {
    await submissionApi.deleteComment(id);
    comments.value = comments.value.filter((c) => c.id !== id);
    emit('count', comments.value.length);
    toast.success('Kommentar gelöscht');
  } catch (err) {
    toast.error(errorMessage(err));
  }
}

onMounted(load);
</script>

<template>
  <section aria-labelledby="comments-title">
    <h2 id="comments-title" class="label-caps mb-2">Kommentare · {{ comments.length }}</h2>

    <p v-if="loading" class="py-4 text-sm text-muted">Lade Kommentare …</p>
    <ul v-else-if="comments.length" class="divide-y divide-line">
      <CommentItem v-for="c in comments" :key="c.id" :comment="c" @delete="remove" />
    </ul>
    <p v-else class="py-4 text-sm text-muted">Noch keine Kommentare – schreib den ersten!</p>

    <form class="mt-4 space-y-3" @submit.prevent="send">
      <BaseTextarea v-model="body" label="Kommentar schreiben" :maxlength="1000" :rows="3" placeholder="Was gefällt dir an diesem Bild?" hide-label />
      <AlertMessage v-if="error">{{ error }}</AlertMessage>
      <div class="flex justify-end">
        <BaseButton type="submit" size="sm" :loading="sending" :disabled="!body.trim()">Kommentieren</BaseButton>
      </div>
    </form>
  </section>
</template>
