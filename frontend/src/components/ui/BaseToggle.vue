<script setup lang="ts">
import { useId } from 'vue';

defineProps<{ label: string; description?: string }>();
const model = defineModel<boolean>({ required: true });
const id = useId();
</script>

<template>
  <div class="flex items-start justify-between gap-4">
    <div>
      <label :for="id" class="text-sm font-medium text-ink">{{ label }}</label>
      <p v-if="description" class="text-xs text-muted">{{ description }}</p>
    </div>
    <button
      :id="id"
      type="button"
      role="switch"
      :aria-checked="model"
      class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line transition-colors"
      :class="model ? 'bg-ink' : 'bg-surface-2'"
      @click="model = !model"
    >
      <span
        class="inline-block size-4 rounded-full bg-canvas shadow transition-transform"
        :class="model ? 'translate-x-6' : 'translate-x-1 bg-muted'"
      />
    </button>
  </div>
</template>
