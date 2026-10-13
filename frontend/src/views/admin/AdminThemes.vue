<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { adminApi } from '@/api/admin';
import { errorMessage } from '@/api/http';
import type { Theme } from '@/api/types';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();
const themes = ref<Theme[]>([]);
const error = ref<string | null>(null);
const saving = ref(false);
const form = reactive<{ kind: Theme['kind']; title: string; description: string }>({ kind: 'subject', title: '', description: '' });

const groups = computed(() => [
  { kind: 'subject' as const, title: 'Themen', hint: 'Das Hauptmotiv einer Challenge.', items: themes.value.filter((t) => t.kind === 'subject') },
  { kind: 'twist' as const, title: 'Twists', hint: 'Optionale Zusatzregel, die der Generator zufällig ergänzt.', items: themes.value.filter((t) => t.kind === 'twist') },
]);

async function load() {
  try {
    themes.value = (await adminApi.themes()).themes;
  } catch (err) {
    error.value = errorMessage(err);
  }
}

async function create() {
  saving.value = true;
  try {
    await adminApi.createTheme({ ...form });
    form.title = '';
    form.description = '';
    toast.success('Hinzugefügt');
    await load();
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    saving.value = false;
  }
}

async function toggle(t: Theme) {
  try {
    const { theme } = await adminApi.updateTheme(t.id, { active: !t.active });
    Object.assign(t, theme);
  } catch (err) {
    toast.error(errorMessage(err));
  }
}

async function remove(t: Theme) {
  try {
    await adminApi.deleteTheme(t.id);
    themes.value = themes.value.filter((x) => x.id !== t.id);
  } catch (err) {
    toast.error(errorMessage(err));
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-10">
    <AlertMessage v-if="error">{{ error }}</AlertMessage>

    <form class="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-[auto_1fr_2fr_auto] sm:items-end" @submit.prevent="create">
      <div class="space-y-1.5">
        <label for="theme-kind" class="label-caps block">Art</label>
        <select id="theme-kind" v-model="form.kind" class="h-11 rounded-xl border border-line bg-surface px-3 text-sm">
          <option value="subject">Thema</option>
          <option value="twist">Twist</option>
        </select>
      </div>
      <BaseInput v-model="form.title" label="Titel" :maxlength="80" required />
      <BaseInput v-model="form.description" label="Beschreibung" :maxlength="500" />
      <BaseButton type="submit" :loading="saving" :disabled="form.title.trim().length < 2">Hinzufügen</BaseButton>
    </form>

    <section v-for="g in groups" :key="g.kind">
      <h2 class="text-lg font-semibold">{{ g.title }} <span class="font-mono text-sm text-muted">({{ g.items.length }})</span></h2>
      <p class="mb-4 text-sm text-muted">{{ g.hint }}</p>
      <ul class="grid gap-3 sm:grid-cols-2">
        <li
          v-for="t in g.items"
          :key="t.id"
          class="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface p-4"
          :class="{ 'opacity-50': !t.active }"
        >
          <div class="min-w-0">
            <p class="font-medium">{{ t.title }}</p>
            <p class="text-sm text-muted">{{ t.description }}</p>
          </div>
          <div class="flex shrink-0 gap-1">
            <BaseButton size="sm" variant="ghost" @click="toggle(t)">{{ t.active ? 'Pausieren' : 'Aktivieren' }}</BaseButton>
            <BaseButton size="sm" variant="ghost" :aria-label="`${t.title} löschen`" @click="remove(t)">✕</BaseButton>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
