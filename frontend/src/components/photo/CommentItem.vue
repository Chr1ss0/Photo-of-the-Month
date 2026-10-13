<script setup lang="ts">
import type { Comment } from '@/api/types';
import { formatDateTime, relativeTime } from '@/utils/format';

defineProps<{ comment: Comment }>();
const emit = defineEmits<{ delete: [id: number] }>();
</script>

<template>
  <li class="group flex gap-3 py-4">
    <span class="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-xs uppercase">
      {{ comment.user.username.charAt(0) }}
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2">
        <span class="text-sm font-medium">{{ comment.user.username }}</span>
        <time :datetime="comment.createdAt" :title="formatDateTime(comment.createdAt)" class="text-xs text-muted">
          {{ relativeTime(comment.createdAt) }}
        </time>
        <button
          v-if="comment.canDelete"
          type="button"
          class="ml-auto text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent focus:opacity-100"
          @click="emit('delete', comment.id)"
        >
          Löschen
        </button>
      </div>
      <!-- Text wird von Vue automatisch escaped (kein v-html) -->
      <p class="mt-1 text-sm leading-relaxed break-words whitespace-pre-line text-ink/90" data-testid="comment-body">{{ comment.body }}</p>
    </div>
  </li>
</template>
