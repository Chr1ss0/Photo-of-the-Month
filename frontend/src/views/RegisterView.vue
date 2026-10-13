<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthLayout from '@/components/layout/AuthLayout.vue';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useAsync } from '@/composables/useAsync';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const { loading, error, run } = useAsync();

const username = ref('');
const password = ref('');
const confirm = ref('');

const usernameError = computed(() =>
  username.value && !/^[A-Za-z0-9._-]{3,32}$/.test(username.value) ? '3–32 Zeichen: Buchstaben, Zahlen, . _ -' : null,
);
const passwordError = computed(() =>
  password.value && password.value.length < 10 ? 'Mindestens 10 Zeichen' : null,
);
const confirmError = computed(() =>
  confirm.value && confirm.value !== password.value ? 'Passwörter stimmen nicht überein' : null,
);
const valid = computed(
  () => username.value && password.value && confirm.value && !usernameError.value && !passwordError.value && !confirmError.value,
);

async function submit() {
  if (!valid.value) return;
  const ok = await run(() => auth.register(username.value, password.value).then(() => true));
  if (ok) await router.replace('/');
}
</script>

<template>
  <AuthLayout title="Konto erstellen" subtitle="Jeden Monat ein neues Thema. Ein Foto. Deine Sicht.">
    <AlertMessage v-if="!auth.registrationOpen" kind="info">Die Registrierung ist derzeit deaktiviert.</AlertMessage>
    <form v-else class="space-y-5" novalidate @submit.prevent="submit">
      <BaseInput v-model="username" label="Benutzername" autocomplete="username" required :maxlength="32" :error="usernameError" />
      <BaseInput
        v-model="password"
        label="Passwort"
        type="password"
        autocomplete="new-password"
        required
        :maxlength="128"
        :error="passwordError"
        hint="Mindestens 10 Zeichen – am besten eine Passphrase."
      />
      <BaseInput v-model="confirm" label="Passwort wiederholen" type="password" autocomplete="new-password" required :maxlength="128" :error="confirmError" />
      <AlertMessage v-if="error">{{ error }}</AlertMessage>
      <BaseButton type="submit" block size="lg" :loading="loading" :disabled="!valid">Registrieren</BaseButton>
    </form>
    <template #footer>
      Bereits registriert?
      <RouterLink to="/login" class="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
        Anmelden
      </RouterLink>
    </template>
  </AuthLayout>
</template>
