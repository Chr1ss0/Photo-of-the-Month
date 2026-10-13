<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { challengeApi } from '@/api/challenges';
import { errorMessage } from '@/api/http';
import { submissionApi } from '@/api/submissions';
import type { Challenge, Submission } from '@/api/types';
import ChallengeHero from '@/components/challenge/ChallengeHero.vue';
import ExifInfoBox from '@/components/photo/ExifInfoBox.vue';
import PhotoUploader from '@/components/photo/PhotoUploader.vue';
import SubmissionEditor from '@/components/photo/SubmissionEditor.vue';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import BaseToggle from '@/components/ui/BaseToggle.vue';
import { useToast } from '@/composables/useToast';

const toast = useToast();
const challenge = ref<Challenge | null>(null);
const participantCount = ref(0);
const mine = ref<Submission | null>(null);
const loadError = ref<string | null>(null);

const file = ref<File | null>(null);
const description = ref('');
const showLocation = ref(true);
const uploading = ref(false);
const uploadError = ref<string | null>(null);

async function load() {
  try {
    const res = await challengeApi.current();
    challenge.value = res.challenge;
    participantCount.value = res.participantCount;
    mine.value = res.mySubmission;
  } catch (err) {
    loadError.value = errorMessage(err);
  }
}

async function upload() {
  if (!file.value) return;
  uploading.value = true;
  uploadError.value = null;
  try {
    const { submission } = await submissionApi.create(file.value, description.value, showLocation.value);
    mine.value = submission;
    participantCount.value += 1;
    file.value = null;
    description.value = '';
    toast.success('Foto eingereicht – viel Glück!');
  } catch (err) {
    uploadError.value = errorMessage(err);
  } finally {
    uploading.value = false;
  }
}

function onDeleted() {
  mine.value = null;
  participantCount.value = Math.max(0, participantCount.value - 1);
}

onMounted(load);
</script>

<template>
  <div>
    <AlertMessage v-if="loadError">{{ loadError }}</AlertMessage>
    <div v-else-if="!challenge" class="h-80 animate-pulse rounded-3xl bg-surface-2" />

    <template v-else>
      <ChallengeHero :challenge="challenge" :participant-count="participantCount" />

      <!-- Eigene Einsendung -->
      <section v-if="mine" class="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold tracking-tight">Deine Einsendung</h2>
            <RouterLink :to="{ name: 'photo', params: { id: mine.id } }" class="text-sm text-muted hover:text-ink">
              Detailansicht →
            </RouterLink>
          </div>
          <figure class="viewfinder p-2 text-ink">
            <img
              :src="mine.imageUrl"
              :alt="mine.description || 'Deine Einsendung'"
              :width="mine.width"
              :height="mine.height"
              class="w-full rounded-xl bg-surface-2"
            />
          </figure>
          <ExifInfoBox :exif="mine.exif" />
        </div>
        <aside class="space-y-4">
          <AlertMessage kind="info">
            Dein Foto ist bis zum Ende der Frist nur für dich sichtbar. Danach erscheint es in der Galerie.
          </AlertMessage>
          <SubmissionEditor :submission="mine" @updated="mine = $event" @deleted="onDeleted" />
        </aside>
      </section>

      <!-- Upload -->
      <section v-else-if="challenge.status === 'open'" class="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 class="mb-6 text-xl font-semibold tracking-tight">Dein Beitrag</h2>
          <PhotoUploader v-model="file" @error="uploadError = $event" />
        </div>
        <form class="space-y-5 lg:pt-14" @submit.prevent="upload">
          <BaseTextarea v-model="description" label="Beschreibung (optional)" placeholder="Wie ist das Foto entstanden?" />
          <BaseToggle
            v-model="showLocation"
            label="Standort anzeigen"
            description="Falls das Foto GPS-Daten enthält, werden sie in der Info-Box gezeigt."
          />
          <AlertMessage v-if="uploadError">{{ uploadError }}</AlertMessage>
          <BaseButton type="submit" variant="accent" size="lg" block :loading="uploading" :disabled="!file">
            Foto einreichen
          </BaseButton>
          <p class="text-xs leading-relaxed text-muted">
            Blende, Verschlusszeit, ISO, Weißabgleich, Belichtungskorrektur und GPS werden automatisch aus den
            EXIF-Daten gelesen. Das gespeicherte Bild selbst enthält keine Metadaten mehr. Bis zum Monatsende kannst du
            dein Foto jederzeit austauschen.
          </p>
        </form>
      </section>
    </template>
  </div>
</template>
