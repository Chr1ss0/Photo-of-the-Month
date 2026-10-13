<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { errorMessage } from '@/api/http';
import { submissionApi } from '@/api/submissions';
import type { Submission } from '@/api/types';
import CommentSection from '@/components/photo/CommentSection.vue';
import ExifInfoBox from '@/components/photo/ExifInfoBox.vue';
import SubmissionEditor from '@/components/photo/SubmissionEditor.vue';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { formatDate, formatPeriod } from '@/utils/format';

const props = defineProps<{ id: number }>();
const auth = useAuthStore();
const router = useRouter();

const submission = ref<Submission | null>(null);
const error = ref<string | null>(null);
const fullscreen = ref(false);
const confirmDelete = ref(false);
const deleting = ref(false);
const toast = useToast();

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') fullscreen.value = false;
};
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

async function adminDelete() {
  if (!submission.value) return;
  deleting.value = true;
  try {
    await submissionApi.remove(submission.value.id);
    toast.success('Foto entfernt');
    await router.push('/galerie');
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    deleting.value = false;
    confirmDelete.value = false;
  }
}

watch(
  () => props.id,
  async (id) => {
    submission.value = null;
    error.value = null;
    try {
      submission.value = (await submissionApi.get(id)).submission;
    } catch (err) {
      error.value = errorMessage(err);
    }
  },
  { immediate: true },
);

function back() {
  if (window.history.state?.back) router.back();
  else void router.push(submission.value?.isOpen ? '/' : '/galerie');
}
</script>

<template>
  <div>
    <button type="button" class="mb-8 text-sm text-muted hover:text-ink" @click="back">← Zurück</button>

    <AlertMessage v-if="error">{{ error }}</AlertMessage>
    <div v-else-if="!submission" class="aspect-[3/2] animate-pulse rounded-2xl bg-surface-2" />

    <article v-else>
      <!-- Bild -->
      <figure class="viewfinder p-2 text-ink">
        <button type="button" class="block w-full cursor-zoom-in" aria-label="Foto vergrößern" @click="fullscreen = true">
          <img
            :src="submission.imageUrl"
            :alt="submission.description || `Foto von ${submission.user.username}`"
            :width="submission.width"
            :height="submission.height"
            class="mx-auto max-h-[80vh] w-auto rounded-xl bg-surface-2 object-contain"
          />
        </button>
      </figure>

      <div class="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div class="space-y-8">
          <header>
            <RouterLink
              v-if="!submission.isOpen"
              :to="{ name: 'gallery-month', params: { period: submission.challenge.period } }"
              class="label-caps hover:text-ink"
            >
              {{ formatPeriod(submission.challenge.period) }} · Challenge
            </RouterLink>
            <p v-else class="label-caps">{{ formatPeriod(submission.challenge.period) }} · Challenge läuft</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ submission.challenge.title }}</h1>
            <p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span class="flex items-center gap-2">
                <span class="grid size-6 place-items-center rounded-full bg-ink font-mono text-[0.65rem] text-canvas uppercase">
                  {{ submission.user.username.charAt(0) }}
                </span>
                <span class="font-medium text-ink">{{ submission.user.username }}</span>
              </span>
              <span aria-hidden="true">·</span>
              <time :datetime="submission.createdAt">eingereicht am {{ formatDate(submission.createdAt) }}</time>
            </p>
          </header>

          <ExifInfoBox :exif="submission.exif" />

          <div v-if="submission.description">
            <h2 class="label-caps mb-2">Beschreibung</h2>
            <!-- Benutzertext wird als Text gerendert (automatisch escaped) -->
            <p class="leading-relaxed break-words whitespace-pre-line" data-testid="description">{{ submission.description }}</p>
          </div>

          <CommentSection :submission-id="submission.id" />
        </div>

        <aside v-if="submission.permissions.edit || submission.permissions.delete" class="space-y-4">
          <SubmissionEditor
            v-if="submission.permissions.edit"
            :submission="submission"
            @updated="submission = $event"
            @deleted="router.push('/meine-fotos')"
          />
          <!-- Moderation für Admins -->
          <div v-else-if="auth.isAdmin" class="space-y-3 rounded-2xl border border-accent/30 p-5">
            <p class="label-caps !text-accent">Moderation</p>
            <p class="text-sm text-muted">Als Admin kannst du dieses Foto entfernen.</p>
            <BaseButton variant="danger" size="sm" @click="confirmDelete = true">Foto entfernen</BaseButton>
            <ConfirmDialog
              :open="confirmDelete"
              title="Foto entfernen?"
              confirm-label="Entfernen"
              :loading="deleting"
              @confirm="adminDelete"
              @cancel="confirmDelete = false"
            >
              Das Foto von „{{ submission.user.username }}“ und alle Kommentare werden endgültig gelöscht.
            </ConfirmDialog>
          </div>
        </aside>
      </div>
    </article>

    <!-- Vollbild -->
    <Teleport to="body">
      <Transition enter-from-class="opacity-0" enter-active-class="transition" leave-to-class="opacity-0" leave-active-class="transition">
        <div
          v-if="fullscreen && submission"
          class="fixed inset-0 z-[80] flex cursor-zoom-out items-center justify-center bg-black/95 p-4"
          role="dialog"
          aria-label="Foto im Vollbild"
          @click="fullscreen = false"
        >
          <img :src="submission.imageUrl" :alt="submission.description" class="max-h-full max-w-full object-contain" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
