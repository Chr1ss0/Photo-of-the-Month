<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { adminApi } from '@/api/admin';
import { ApiError, errorMessage } from '@/api/http';
import type { AdminChallenge } from '@/api/types';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { currentPeriodLocal, formatPeriod, shiftPeriod } from '@/utils/format';

const toast = useToast();
const challenges = ref<AdminChallenge[]>([]);
const serverPeriod = ref<string | null>(null);
const error = ref<string | null>(null);
const busy = ref<string | null>(null);
const forcePeriod = ref<string | null>(null);

// Editor
const editing = ref<string | null>(null);
const form = reactive({ title: '', description: '', twist: '' });

/** Aktueller Monat + die nächsten drei, auch wenn noch keine Challenge existiert. */
const upcoming = computed(() => {
  // Monatsgrenzen bestimmt der Server (App-Zeitzone), nicht die Browser-Uhr
  const now = serverPeriod.value ?? currentPeriodLocal();
  return [0, 1, 2, 3].map((i) => shiftPeriod(now, i));
});
const byPeriod = computed(() => new Map(challenges.value.map((c) => [c.period, c])));
const past = computed(() => challenges.value.filter((c) => c.status === 'closed'));

async function load() {
  try {
    const res = await adminApi.challenges();
    challenges.value = res.challenges;
    serverPeriod.value = res.currentPeriod;
  } catch (err) {
    error.value = errorMessage(err);
  }
}

function edit(period: string) {
  const c = byPeriod.value.get(period);
  form.title = c?.title ?? '';
  form.description = c?.description ?? '';
  form.twist = c?.twist ?? '';
  editing.value = period;
}

async function save() {
  if (!editing.value) return;
  busy.value = editing.value;
  try {
    await adminApi.saveChallenge(editing.value, { title: form.title, description: form.description, twist: form.twist || null });
    toast.success('Challenge gespeichert');
    editing.value = null;
    await load();
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    busy.value = null;
  }
}

async function generate(period: string, force = false) {
  busy.value = period;
  try {
    const { challenge } = await adminApi.generateChallenge(period, force);
    toast.success(`Neue Aufgabe: ${challenge.title}`);
    forcePeriod.value = null;
    await load();
  } catch (err) {
    if (err instanceof ApiError && err.status === 409 && !force) forcePeriod.value = period;
    else toast.error(errorMessage(err));
  } finally {
    busy.value = null;
  }
}

async function remove(period: string) {
  busy.value = period;
  try {
    await adminApi.deleteChallenge(period);
    toast.success('Challenge entfernt');
    await load();
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    busy.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-12">
    <AlertMessage v-if="error">{{ error }}</AlertMessage>

    <section>
      <h2 class="mb-1 text-lg font-semibold">Aktuell &amp; geplant</h2>
      <p class="mb-6 text-sm text-muted">
        Fehlt eine Challenge, würfelt der Generator sie zum Monatsbeginn automatisch aus dem Themen-Pool.
      </p>
      <ul class="space-y-3">
        <li v-for="p in upcoming" :key="p" class="rounded-2xl border border-line bg-surface p-5">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="label-caps">{{ formatPeriod(p) }} {{ p === upcoming[0] ? '· läuft' : '' }}</p>
              <template v-if="byPeriod.get(p)">
                <p class="mt-1 text-lg font-medium">{{ byPeriod.get(p)!.title }}</p>
                <p class="text-sm text-muted">{{ byPeriod.get(p)!.description }}</p>
                <p v-if="byPeriod.get(p)!.twist" class="mt-1 text-sm">Twist: {{ byPeriod.get(p)!.twist }}</p>
                <p class="mt-2 font-mono text-xs text-muted">{{ byPeriod.get(p)!.submissionCount }} Einsendungen</p>
              </template>
              <p v-else class="mt-1 text-sm text-muted italic">Noch nicht festgelegt – wird automatisch generiert.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <BaseButton size="sm" variant="secondary" :loading="busy === p" @click="generate(p)">🎲 Würfeln</BaseButton>
              <BaseButton size="sm" variant="ghost" @click="edit(p)">Bearbeiten</BaseButton>
              <BaseButton
                v-if="byPeriod.get(p) && !byPeriod.get(p)!.submissionCount && p !== upcoming[0]"
                size="sm"
                variant="ghost"
                @click="remove(p)"
              >
                Entfernen
              </BaseButton>
            </div>
          </div>

          <form v-if="editing === p" class="mt-5 space-y-4 border-t border-line pt-5" @submit.prevent="save">
            <BaseInput v-model="form.title" label="Titel" required :maxlength="120" />
            <BaseTextarea v-model="form.description" label="Beschreibung" :maxlength="1000" :rows="3" />
            <BaseInput v-model="form.twist" label="Twist (optional)" :maxlength="300" />
            <div class="flex gap-2">
              <BaseButton type="submit" size="sm" :loading="busy === p" :disabled="form.title.trim().length < 2">Speichern</BaseButton>
              <BaseButton size="sm" variant="ghost" @click="editing = null">Abbrechen</BaseButton>
            </div>
          </form>
        </li>
      </ul>
    </section>

    <section v-if="past.length">
      <h2 class="mb-4 text-lg font-semibold">Archiv</h2>
      <div class="overflow-x-auto rounded-2xl border border-line">
        <table class="w-full text-left text-sm">
          <thead class="bg-surface-2 label-caps">
            <tr>
              <th class="px-4 py-3 font-normal">Monat</th>
              <th class="px-4 py-3 font-normal">Titel</th>
              <th class="px-4 py-3 text-right font-normal">Fotos</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line bg-surface">
            <tr v-for="c in past" :key="c.id">
              <td class="px-4 py-3 font-mono text-xs whitespace-nowrap">{{ formatPeriod(c.period) }}</td>
              <td class="px-4 py-3">{{ c.title }}</td>
              <td class="px-4 py-3 text-right font-mono">{{ c.submissionCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ConfirmDialog
      :open="forcePeriod !== null"
      title="Trotzdem neu würfeln?"
      confirm-label="Neu würfeln"
      :loading="busy === forcePeriod"
      @confirm="forcePeriod && generate(forcePeriod, true)"
      @cancel="forcePeriod = null"
    >
      Für diese Challenge gibt es bereits Einsendungen. Wenn du das Thema änderst, passen die eingereichten Fotos
      eventuell nicht mehr dazu.
    </ConfirmDialog>
  </div>
</template>
