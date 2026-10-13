<script setup lang="ts">
withDefaults(defineProps<{ kind?: 'error' | 'info' | 'success' }>(), { kind: 'error' });
</script>

<template>
  <div
    :role="kind === 'error' ? 'alert' : 'status'"
    class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
    :class="{
      'border-accent/30 bg-accent/5 text-accent': kind === 'error',
      'border-line bg-surface-2 text-ink': kind === 'info',
      'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400': kind === 'success',
    }"
  >
    <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
    <div><slot /></div>
  </div>
</template>
