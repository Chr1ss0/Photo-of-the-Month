import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '@/api/auth';
import type { User } from '@/api/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const registrationOpen = ref(true);
  const initialized = ref(false);
  let initPromise: Promise<void> | null = null;

  const isLoggedIn = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'admin');

  /** Lädt den aktuellen Benutzer einmalig vom Server (Session-Cookie). */
  function init(): Promise<void> {
    initPromise ??= authApi
      .me()
      .then((res) => {
        user.value = res.user;
        registrationOpen.value = res.registrationOpen;
      })
      .catch(() => {
        user.value = null;
      })
      .finally(() => {
        initialized.value = true;
      });
    return initPromise;
  }

  async function login(username: string, password: string) {
    user.value = (await authApi.login(username, password)).user;
  }

  async function register(username: string, password: string) {
    user.value = (await authApi.register(username, password)).user;
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      user.value = null;
    }
  }

  /** Lokal abmelden, z. B. wenn die Session serverseitig abgelaufen ist. */
  function clear() {
    user.value = null;
  }

  return { user, registrationOpen, initialized, isLoggedIn, isAdmin, init, login, register, logout, clear };
});
