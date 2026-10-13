<script setup lang="ts">
import ApertureIcon from './ApertureIcon.vue';
</script>

<template>
  <RouterLink to="/" class="group flex items-center gap-2.5" aria-label="Photo of the Month – Startseite">
    <span class="relative">
      <ApertureIcon class="size-7 transition-transform duration-700 group-hover:rotate-[60deg]" />
      <span class="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-accent" />
    </span>
    <span class="leading-none">
      <span class="block text-[0.95rem] font-semibold tracking-tight">Photo of the Month</span>
      <span class="label-caps block !text-[0.55rem]">Monthly Challenge</span>
    </span>
  </RouterLink>
</template>
