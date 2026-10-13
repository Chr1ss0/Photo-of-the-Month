<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthLayout from '@/components/layout/AuthLayout.vue';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useAsync } from '@/composables/useAsync';
import { safeRedirect } from '@/utils/url';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { loading, error, run } = useAsync();

const username = ref('');
const password = ref('');

async function submit() {
  const ok = await run(() => auth.login(username.value, password.value).then(() => true));
  password.value = '';
  if (ok) await router.replace(safeRedirect(route.query.redirect));
}
</script>

<template>
  <AuthLayout title="Willkommen zurück" subtitle="Melde dich an, um an der aktuellen Challenge teilzunehmen.">
    <form class="space-y-5" novalidate @submit.prevent="submit">
      <BaseInput v-model="username" label="Benutzername" autocomplete="username" required :maxlength="32" />
      <BaseInput v-model="password" label="Passwort" type="password" autocomplete="current-password" required :maxlength="128" />
      <AlertMessage v-if="error">{{ error }}</AlertMessage>
      <BaseButton type="submit" block size="lg" :loading="loading" :disabled="!username || !password">Anmelden</BaseButton>
    </form>
    <template v-if="auth.registrationOpen" #footer>
      Noch kein Konto?
      <RouterLink to="/registrieren" class="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
        Jetzt registrieren
      </RouterLink>
    </template>
  </AuthLayout>
</template>
