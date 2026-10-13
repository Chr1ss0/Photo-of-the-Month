<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
  label: string;
  type?: string;
  error?: string | null;
  hint?: string;
  autocomplete?: string;
  required?: boolean;
  maxlength?: number;
  minlength?: number;
  placeholder?: string;
}>();

const model = defineModel<string>({ required: true });
const id = useId();
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="label-caps block">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :required="required"
      :maxlength="maxlength"
      :minlength="minlength"
      :placeholder="placeholder"
      :aria-invalid="!!error"
      :aria-describedby="error || hint ? `${id}-msg` : undefined"
      class="block h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted/60 transition-colors focus:border-ink focus:outline-none"
    />
    <p v-if="error" :id="`${id}-msg`" class="text-xs text-accent">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-msg`" class="text-xs text-muted">{{ hint }}</p>
  </div>
</template>
