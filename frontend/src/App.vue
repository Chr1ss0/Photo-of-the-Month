<script setup lang="ts">
import AppFooter from '@/components/layout/AppFooter.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import ToastHost from '@/components/ui/ToastHost.vue';
</script>

<template>
  <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-canvas">
    Zum Inhalt springen
  </a>
  <div class="flex min-h-dvh flex-col">
    <AppHeader />
    <main id="main" class="mx-auto w-full max-w-6xl flex-1 px-5 pt-10">
      <RouterView v-slot="{ Component, route }">
        <Transition
          mode="out-in"
          enter-from-class="opacity-0 translate-y-1"
          enter-active-class="transition duration-200 ease-out"
          leave-to-class="opacity-0"
          leave-active-class="transition duration-100"
        >
          <component :is="Component" :key="route.matched[0]?.path" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter />
  </div>
  <ToastHost />
</template>
