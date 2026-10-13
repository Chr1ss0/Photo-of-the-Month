<script setup lang="ts">
import { useId } from 'vue';

const props = withDefaults(
  defineProps<{ label: string; maxlength?: number; rows?: number; placeholder?: string; hideLabel?: boolean }>(),
  { maxlength: 2000, rows: 4, hideLabel: false },
);
const model = defineModel<string>({ required: true });
const id = useId();
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-baseline justify-between" :class="{ 'sr-only': props.hideLabel }">
      <label :for="id" class="label-caps">{{ label }}</label>
      <span class="font-mono text-[0.65rem] text-muted tabular-nums">{{ model.length }}/{{ maxlength }}</span>
    </div>
    <textarea
      :id="id"
      v-model="model"
      :rows="rows"
      :maxlength="maxlength"
      :placeholder="placeholder"
      class="block w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none"
    />
  </div>
</template>
