<script setup lang="ts">
import { computed, ref } from 'vue';
import { authApi } from '@/api/auth';
import PageHeader from '@/components/layout/PageHeader.vue';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useAsync } from '@/composables/useAsync';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const toast = useToast();
const { loading, error, run } = useAsync();

const current = ref('');
const next = ref('');
const confirm = ref('');

const nextError = computed(() => (next.value && next.value.length < 10 ? 'Mindestens 10 Zeichen' : null));
const confirmError = computed(() => (confirm.value && confirm.value !== next.value ? 'Stimmt nicht überein' : null));
const valid = computed(() => current.value && next.value && confirm.value && !nextError.value && !confirmError.value);

async function submit() {
  const ok = await run(() => authApi.changePassword(current.value, next.value).then(() => true));
  if (ok) {
    current.value = next.value = confirm.value = '';
    toast.success('Passwort geändert – andere Geräte wurden abgemeldet.');
  }
}
</script>

<template>
  <div class="max-w-xl">
    <PageHeader eyebrow="Konto" :title="auth.user?.username ?? ''" :subtitle="auth.isAdmin ? 'Administrator' : 'Mitglied'" />

    <section class="rounded-2xl border border-line bg-surface p-6">
      <h2 class="text-lg font-semibold">Passwort ändern</h2>
      <p class="mt-1 text-sm text-muted">Nach der Änderung werden alle anderen Sitzungen beendet.</p>
      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <BaseInput v-model="current" label="Aktuelles Passwort" type="password" autocomplete="current-password" required />
        <BaseInput v-model="next" label="Neues Passwort" type="password" autocomplete="new-password" required :error="nextError" />
        <BaseInput v-model="confirm" label="Neues Passwort wiederholen" type="password" autocomplete="new-password" required :error="confirmError" />
        <AlertMessage v-if="error">{{ error }}</AlertMessage>
        <BaseButton type="submit" :loading="loading" :disabled="!valid">Passwort ändern</BaseButton>
      </form>
    </section>
  </div>
</template>
