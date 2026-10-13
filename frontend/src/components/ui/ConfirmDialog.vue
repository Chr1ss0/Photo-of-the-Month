<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import BaseButton from './BaseButton.vue';

const props = withDefaults(
  defineProps<{ open: boolean; title: string; confirmLabel?: string; danger?: boolean; loading?: boolean }>(),
  { confirmLabel: 'Bestätigen', danger: true, loading: false },
);
const emit = defineEmits<{ confirm: []; cancel: [] }>();

const dialog = ref<HTMLDialogElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    await nextTick();
    if (open && !dialog.value?.open) dialog.value?.showModal();
    if (!open && dialog.value?.open) dialog.value.close();
  },
  { immediate: true },
);
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(92vw,26rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    @cancel.prevent="emit('cancel')"
  >
    <div class="p-6">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <div class="mt-2 text-sm text-muted"><slot /></div>
      <div class="mt-6 flex justify-end gap-2">
        <BaseButton variant="ghost" @click="emit('cancel')">Abbrechen</BaseButton>
        <BaseButton :variant="danger ? 'accent' : 'primary'" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel }}
        </BaseButton>
      </div>
    </div>
  </dialog>
</template>
