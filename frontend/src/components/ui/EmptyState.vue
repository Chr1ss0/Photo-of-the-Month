<script setup lang="ts">
import ApertureIcon from '@/components/layout/ApertureIcon.vue';

defineProps<{ title: string; text?: string }>();
</script>

<template>
  <div class="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
    <ApertureIcon class="mb-5 size-10 text-muted/60" />
    <h3 class="text-base font-medium">{{ title }}</h3>
    <p v-if="text" class="mt-1 max-w-sm text-sm text-muted">{{ text }}</p>
    <div v-if="$slots.default" class="mt-6"><slot /></div>
  </div>
</template>
