<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toasts, dismiss } = useToast();
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
    <TransitionGroup
      enter-from-class="translate-y-3 opacity-0"
      enter-active-class="transition duration-200"
      leave-to-class="opacity-0"
      leave-active-class="transition duration-150"
    >
      <button
        v-for="t in toasts"
        :key="t.id"
        type="button"
        class="pointer-events-auto flex items-center gap-3 rounded-full border border-line bg-surface px-5 py-2.5 text-sm shadow-lg"
        @click="dismiss(t.id)"
      >
        <span
          class="size-2 rounded-full"
          :class="{ 'bg-emerald-500': t.kind === 'success', 'bg-accent': t.kind === 'error', 'bg-muted': t.kind === 'info' }"
        />
        {{ t.message }}
      </button>
    </TransitionGroup>
  </div>
</template>
