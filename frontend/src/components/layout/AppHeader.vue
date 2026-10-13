<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from '@/composables/useTheme';
import { useAuthStore } from '@/stores/auth';
import AppLogo from './AppLogo.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { theme, toggle } = useTheme();
const menuOpen = ref(false);

watch(() => route.fullPath, () => (menuOpen.value = false));

const links = [
  { to: '/', label: 'Challenge', exact: true },
  { to: '/galerie', label: 'Galerie' },
  { to: '/meine-fotos', label: 'Meine Fotos' },
];

function isActive(to: string, exact?: boolean) {
  return exact ? route.path === to : route.path.startsWith(to);
}

async function logout() {
  await auth.logout();
  await router.push({ name: 'login' });
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
      <AppLogo />

      <nav v-if="auth.isLoggedIn" class="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="relative rounded-full px-4 py-2 text-sm transition-colors"
          :class="isActive(l.to, l.exact) ? 'text-ink' : 'text-muted hover:text-ink'"
        >
          {{ l.label }}
          <span
            v-if="isActive(l.to, l.exact)"
            class="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent"
          />
        </RouterLink>
        <RouterLink
          v-if="auth.isAdmin"
          to="/admin"
          class="relative rounded-full px-4 py-2 text-sm transition-colors"
          :class="isActive('/admin') ? 'text-ink' : 'text-muted hover:text-ink'"
        >
          Admin
          <span v-if="isActive('/admin')" class="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" />
        </RouterLink>
      </nav>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          :aria-label="theme === 'dark' ? 'Helles Design' : 'Dunkles Design'"
          @click="toggle"
        >
          <svg v-if="theme === 'dark'" class="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else class="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        </button>

        <template v-if="auth.isLoggedIn">
          <RouterLink
            to="/konto"
            class="hidden items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink sm:flex"
          >
            <span class="grid size-7 place-items-center rounded-full bg-ink font-mono text-xs text-canvas uppercase">
              {{ auth.user?.username.charAt(0) }}
            </span>
            {{ auth.user?.username }}
          </RouterLink>
          <button
            type="button"
            class="hidden rounded-full px-3 py-2 text-sm text-muted hover:text-ink sm:block"
            @click="logout"
          >
            Abmelden
          </button>
          <button
            type="button"
            class="grid size-9 place-items-center rounded-full hover:bg-surface-2 md:hidden"
            :aria-expanded="menuOpen"
            aria-label="Menü"
            @click="menuOpen = !menuOpen"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path v-if="!menuOpen" d="M4 8h16M4 16h16" />
              <path v-else d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </template>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <nav v-if="menuOpen && auth.isLoggedIn" class="border-t border-line px-5 py-3 md:hidden" aria-label="Mobile Navigation">
      <RouterLink
        v-for="l in links"
        :key="l.to"
        :to="l.to"
        class="block rounded-lg px-3 py-2.5 text-sm"
        :class="isActive(l.to, l.exact) ? 'bg-surface-2 text-ink' : 'text-muted'"
      >
        {{ l.label }}
      </RouterLink>
      <RouterLink v-if="auth.isAdmin" to="/admin" class="block rounded-lg px-3 py-2.5 text-sm text-muted">Admin</RouterLink>
      <RouterLink to="/konto" class="block rounded-lg px-3 py-2.5 text-sm text-muted">Konto</RouterLink>
      <button type="button" class="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted" @click="logout">
        Abmelden
      </button>
    </nav>
  </header>
</template>
