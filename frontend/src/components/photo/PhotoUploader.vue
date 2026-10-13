<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { ACCEPT_ATTR, MAX_UPLOAD_MB, validateImageFile } from '@/utils/image';

const file = defineModel<File | null>({ required: true });
const emit = defineEmits<{ error: [message: string] }>();

const dragging = ref(false);
const preview = ref<string | null>(null);
const input = ref<HTMLInputElement | null>(null);

watch(file, (f) => {
  if (preview.value) URL.revokeObjectURL(preview.value);
  preview.value = f ? URL.createObjectURL(f) : null;
});
onBeforeUnmount(() => preview.value && URL.revokeObjectURL(preview.value));

function pick(f: File | undefined | null) {
  if (!f) return;
  const err = validateImageFile(f);
  if (err) {
    emit('error', err);
    return;
  }
  file.value = f;
}

function onDrop(e: DragEvent) {
  dragging.value = false;
  pick(e.dataTransfer?.files?.[0]);
}

function onChange(e: Event) {
  const target = e.target as HTMLInputElement;
  pick(target.files?.[0]);
  target.value = '';
}
</script>

<template>
  <div>
    <div class="viewfinder p-2 text-muted">
      <button
        type="button"
        class="group relative flex aspect-[3/2] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-colors"
        :class="dragging ? 'border-ink bg-surface-2 text-ink' : 'border-ink/20 bg-surface hover:border-ink/50 hover:text-ink'"
        @click="input?.click()"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <img v-if="preview" :src="preview" alt="Vorschau des ausgewählten Fotos" class="absolute inset-0 size-full object-contain bg-black/90" />
        <template v-else>
          <svg class="mb-3 size-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
            <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.2-1.8A1.5 1.5 0 0 1 9.6 3.5h4.8a1.5 1.5 0 0 1 1.2.7L16.8 6h1.7A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5Z" />
            <circle cx="12" cy="12.5" r="3.8" />
          </svg>
          <span class="text-sm font-medium">Foto hierher ziehen oder klicken</span>
          <span class="mt-1 font-mono text-[0.68rem] tracking-wider uppercase">JPEG · PNG · WebP · AVIF — max. {{ MAX_UPLOAD_MB }} MB</span>
        </template>
        <span
          v-if="preview"
          class="absolute right-3 bottom-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
        >
          Anderes Foto wählen
        </span>
      </button>
    </div>
    <input ref="input" type="file" class="sr-only" :accept="ACCEPT_ATTR" tabindex="-1" aria-hidden="true" @change="onChange" />
    <p v-if="file" class="mt-2 truncate font-mono text-xs text-muted">
      {{ file.name }} · {{ (file.size / 1024 / 1024).toFixed(1) }} MB
    </p>
  </div>
</template>
