<script setup lang="ts">
import { ref, watch } from 'vue';
import { errorMessage } from '@/api/http';
import { submissionApi } from '@/api/submissions';
import type { Submission } from '@/api/types';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import BaseToggle from '@/components/ui/BaseToggle.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { ACCEPT_ATTR, validateImageFile } from '@/utils/image';

/** Werkzeuge für den Urheber: Beschreibung, Standort, Foto tauschen, löschen. */
const props = defineProps<{ submission: Submission }>();
const emit = defineEmits<{ updated: [s: Submission]; deleted: [] }>();

const toast = useToast();
const description = ref(props.submission.description);
const showLocation = ref(props.submission.showLocation);
const saving = ref(false);
const replacing = ref(false);
const deleting = ref(false);
const confirmDelete = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

watch(
  () => props.submission,
  (s) => {
    description.value = s.description;
    showLocation.value = s.showLocation;
  },
);

const dirty = () => description.value !== props.submission.description || showLocation.value !== props.submission.showLocation;

async function save() {
  saving.value = true;
  try {
    const { submission } = await submissionApi.update(props.submission.id, {
      description: description.value,
      showLocation: showLocation.value,
    });
    emit('updated', submission);
    toast.success('Gespeichert');
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    saving.value = false;
  }
}

async function onReplace(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;
  const err = validateImageFile(file);
  if (err) return toast.error(err);
  replacing.value = true;
  try {
    const { submission } = await submissionApi.replacePhoto(props.submission.id, file);
    emit('updated', submission);
    toast.success('Foto ausgetauscht');
  } catch (e2) {
    toast.error(errorMessage(e2));
  } finally {
    replacing.value = false;
  }
}

async function remove() {
  deleting.value = true;
  try {
    await submissionApi.remove(props.submission.id);
    confirmDelete.value = false;
    toast.success('Einsendung gelöscht');
    emit('deleted');
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="space-y-5 rounded-2xl border border-line bg-surface p-5">
    <p class="label-caps">Deine Einsendung bearbeiten</p>

    <BaseTextarea v-model="description" label="Beschreibung" :maxlength="2000" placeholder="Erzähl etwas über dein Foto …" />
    <BaseToggle
      v-model="showLocation"
      label="Standort anzeigen"
      description="GPS-Koordinaten aus den EXIF-Daten für andere sichtbar machen."
    />
    <div class="flex justify-end">
      <BaseButton size="sm" :loading="saving" :disabled="!dirty()" @click="save">Änderungen speichern</BaseButton>
    </div>

    <div v-if="submission.permissions.replace || submission.permissions.delete" class="flex flex-wrap gap-2 border-t border-line pt-5">
      <template v-if="submission.permissions.replace">
        <BaseButton variant="secondary" size="sm" :loading="replacing" @click="fileInput?.click()">
          Foto austauschen
        </BaseButton>
        <input ref="fileInput" type="file" class="sr-only" :accept="ACCEPT_ATTR" tabindex="-1" aria-hidden="true" @change="onReplace" />
      </template>
      <BaseButton v-if="submission.permissions.delete" variant="danger" size="sm" @click="confirmDelete = true">
        Einsendung löschen
      </BaseButton>
    </div>
    <p v-if="!submission.isOpen" class="text-xs text-muted">
      Die Frist ist abgelaufen – das Foto ist jetzt in der Galerie und kann nicht mehr getauscht werden.
    </p>

    <ConfirmDialog
      :open="confirmDelete"
      title="Einsendung löschen?"
      confirm-label="Löschen"
      :loading="deleting"
      @confirm="remove"
      @cancel="confirmDelete = false"
    >
      Dein Foto und alle Kommentare dazu werden endgültig entfernt.
    </ConfirmDialog>
  </div>
</template>
