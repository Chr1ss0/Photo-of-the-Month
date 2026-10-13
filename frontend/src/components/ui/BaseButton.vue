<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import BaseSpinner from './BaseSpinner.vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
    to?: RouteLocationRaw;
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false, block: false },
);

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150',
  'disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] select-none whitespace-nowrap',
  {
    sm: 'h-8 px-3.5 text-xs',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-7 text-base',
  }[props.size],
  {
    primary: 'bg-ink text-canvas hover:opacity-85',
    accent: 'bg-accent text-accent-ink hover:brightness-110',
    secondary: 'border border-line bg-surface text-ink hover:border-ink/40',
    ghost: 'text-muted hover:text-ink hover:bg-surface-2',
    danger: 'border border-accent/40 text-accent hover:bg-accent hover:text-accent-ink',
  }[props.variant],
  props.block ? 'w-full' : '',
]);
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="classes">
    <slot />
  </RouterLink>
  <button v-else :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading">
    <BaseSpinner v-if="loading" class="size-4" />
    <slot />
  </button>
</template>
