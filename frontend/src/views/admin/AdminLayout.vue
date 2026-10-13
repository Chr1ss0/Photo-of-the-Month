<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';

const tabs = [
  { to: { name: 'admin' }, label: 'Übersicht' },
  { to: { name: 'admin-challenges' }, label: 'Challenges' },
  { to: { name: 'admin-themes' }, label: 'Themen-Pool' },
  { to: { name: 'admin-users' }, label: 'Benutzer' },
  { to: { name: 'admin-moderation' }, label: 'Moderation' },
];
</script>

<template>
  <div>
    <PageHeader eyebrow="Admin" title="Verwaltung" />
    <nav class="-mx-5 mb-10 overflow-x-auto border-b border-line px-5" aria-label="Admin-Bereiche">
      <ul class="flex gap-1">
        <li v-for="t in tabs" :key="t.label">
          <RouterLink
            :to="t.to"
            exact-active-class="!border-accent !text-ink"
            class="-mb-px block border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap text-muted hover:text-ink"
          >
            {{ t.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>
    <RouterView />
  </div>
</template>
