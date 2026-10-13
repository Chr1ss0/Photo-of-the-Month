<script setup lang="ts">
defineProps<{ eyebrow?: string; title: string; subtitle?: string }>();
</script>

<template>
  <div class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p v-if="eyebrow" class="label-caps mb-2 flex items-center gap-2">
        <span class="size-1.5 rounded-full bg-accent" />{{ eyebrow }}
      </p>
      <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{{ title }}</h1>
      <p v-if="subtitle" class="mt-2 max-w-2xl text-muted">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex gap-2"><slot name="actions" /></div>
  </div>
</template>
