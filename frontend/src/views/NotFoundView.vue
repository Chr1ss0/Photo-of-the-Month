<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
</script>

<template>
  <div class="flex flex-col items-center py-24 text-center">
    <p class="font-mono text-7xl font-light tracking-tighter text-muted/60">404</p>
    <h1 class="mt-4 text-2xl font-semibold">Unscharf.</h1>
    <p class="mt-2 text-muted">Diese Seite liegt außerhalb des Fokus.</p>
    <BaseButton to="/" variant="secondary" class="mt-8">Zur Startseite</BaseButton>
  </div>
</template>
