<script setup lang="ts">
import { computed } from 'vue';
import { useCountdown } from '@/composables/useCountdown';
import { formatDeadline } from '@/utils/format';

const props = defineProps<{ deadline: string }>();
const { parts, expired } = useCountdown(() => props.deadline);

const cells = computed(() => [
  { label: 'Tage', value: parts.value.days },
  { label: 'Std', value: parts.value.hours },
  { label: 'Min', value: parts.value.minutes },
  { label: 'Sek', value: parts.value.seconds },
]);
</script>

<template>
  <div>
    <p class="label-caps mb-2">{{ expired ? 'Frist abgelaufen' : 'Verbleibende Zeit' }}</p>
    <div class="flex items-end gap-1 font-mono tabular-nums" role="timer" :aria-label="`Einsendeschluss ${formatDeadline(deadline)}`">
      <template v-for="(c, i) in cells" :key="c.label">
        <div class="text-center">
          <div class="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-2xl leading-none sm:text-3xl">
            {{ String(c.value).padStart(2, '0') }}
          </div>
          <div class="mt-1 text-[0.6rem] tracking-widest text-muted uppercase">{{ c.label }}</div>
        </div>
        <span v-if="i < cells.length - 1" class="pb-6 text-xl text-muted/50">:</span>
      </template>
    </div>
    <p class="mt-3 text-xs text-muted">Einsendeschluss: {{ formatDeadline(deadline) }} Uhr</p>
  </div>
</template>
