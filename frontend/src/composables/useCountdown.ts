import { computed, onBeforeUnmount, onMounted, ref, toValue, type MaybeRefOrGetter } from 'vue';

/** Live-Countdown bis zu einem Zeitpunkt (ISO-String). */
export function useCountdown(target: MaybeRefOrGetter<string | null | undefined>) {
  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | undefined;

  onMounted(() => {
    timer = setInterval(() => (now.value = Date.now()), 1000);
  });
  onBeforeUnmount(() => clearInterval(timer));

  const remainingMs = computed(() => {
    const t = toValue(target);
    return t ? Math.max(0, new Date(t).getTime() - now.value) : 0;
  });

  const parts = computed(() => {
    const s = Math.floor(remainingMs.value / 1000);
    return {
      days: Math.floor(s / 86400),
      hours: Math.floor((s % 86400) / 3600),
      minutes: Math.floor((s % 3600) / 60),
      seconds: s % 60,
    };
  });

  const expired = computed(() => remainingMs.value <= 0);

  return { remainingMs, parts, expired };
}
