<script setup lang="ts">
import ApertureIcon from './ApertureIcon.vue';

defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <div class="mx-auto grid max-w-5xl items-center gap-12 py-6 lg:grid-cols-2">
    <!-- Bildseite mit Sucher-Optik -->
    <div class="relative hidden aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-zinc-950 text-zinc-100 lg:block" aria-hidden="true">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
      <div class="absolute inset-8">
        <span class="absolute top-0 left-0 size-6 border-t border-l border-white/60" />
        <span class="absolute top-0 right-0 size-6 border-t border-r border-white/60" />
        <span class="absolute bottom-0 left-0 size-6 border-b border-l border-white/60" />
        <span class="absolute right-0 bottom-0 size-6 border-r border-b border-white/60" />
      </div>
      <ApertureIcon class="absolute top-1/2 left-1/2 size-40 -translate-x-1/2 -translate-y-1/2 opacity-80 [animation:spin_60s_linear_infinite]" />
      <div class="absolute inset-x-8 bottom-10 flex justify-between font-mono text-xs tracking-widest text-white/70 uppercase">
        <span>ƒ/2.8</span><span>1/250</span><span>ISO 200</span><span class="text-accent">● REC</span>
      </div>
    </div>

    <div class="mx-auto w-full max-w-sm">
      <h1 class="text-3xl font-semibold tracking-tight">{{ title }}</h1>
      <p v-if="subtitle" class="mt-2 text-muted">{{ subtitle }}</p>
      <div class="mt-8"><slot /></div>
      <p v-if="$slots.footer" class="mt-8 text-sm text-muted"><slot name="footer" /></p>
    </div>
  </div>
</template>
