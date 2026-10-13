<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { adminApi } from '@/api/admin';
import { errorMessage } from '@/api/http';
import type { AdminUser } from '@/api/types';
import AlertMessage from '@/components/ui/AlertMessage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { formatDate } from '@/utils/format';

const auth = useAuthStore();
const toast = useToast();
const users = ref<AdminUser[]>([]);
const error = ref<string | null>(null);
const toDelete = ref<AdminUser | null>(null);
const deleting = ref(false);
const resetFor = ref<AdminUser | null>(null);
const newPassword = ref('');

async function load() {
  try {
    users.value = (await adminApi.users()).users;
  } catch (err) {
    error.value = errorMessage(err);
  }
}

async function update(u: AdminUser, data: { role?: AdminUser['role']; disabled?: boolean }) {
  try {
    users.value = (await adminApi.updateUser(u.id, data)).users;
    toast.success('Gespeichert');
  } catch (err) {
    toast.error(errorMessage(err));
  }
}

async function confirmDelete() {
  if (!toDelete.value) return;
  deleting.value = true;
  try {
    await adminApi.deleteUser(toDelete.value.id);
    users.value = users.value.filter((u) => u.id !== toDelete.value?.id);
    toast.success('Benutzer gelöscht');
    toDelete.value = null;
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    deleting.value = false;
  }
}

async function resetPassword() {
  if (!resetFor.value) return;
  try {
    await adminApi.resetPassword(resetFor.value.id, newPassword.value);
    toast.success(`Passwort für ${resetFor.value.username} gesetzt`);
    resetFor.value = null;
    newPassword.value = '';
  } catch (err) {
    toast.error(errorMessage(err));
  }
}

onMounted(load);
</script>

<template>
  <div>
    <AlertMessage v-if="error">{{ error }}</AlertMessage>
    <div class="overflow-x-auto rounded-2xl border border-line">
      <table class="w-full text-left text-sm">
        <thead class="bg-surface-2 label-caps">
          <tr>
            <th class="px-4 py-3 font-normal">Benutzer</th>
            <th class="px-4 py-3 font-normal">Rolle</th>
            <th class="px-4 py-3 font-normal">Seit</th>
            <th class="px-4 py-3 text-right font-normal">Fotos</th>
            <th class="px-4 py-3 text-right font-normal">Aktionen</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line bg-surface">
          <tr v-for="u in users" :key="u.id" :class="{ 'opacity-50': u.disabled }">
            <td class="px-4 py-3">
              <span class="font-medium">{{ u.username }}</span>
              <span v-if="u.id === auth.user?.id" class="ml-2 text-xs text-muted">(du)</span>
              <span v-if="u.disabled" class="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">gesperrt</span>
            </td>
            <td class="px-4 py-3">
              <span class="rounded-full px-2.5 py-0.5 font-mono text-xs" :class="u.role === 'admin' ? 'bg-ink text-canvas' : 'bg-surface-2'">
                {{ u.role }}
              </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-muted">{{ formatDate(u.createdAt) }}</td>
            <td class="px-4 py-3 text-right font-mono">{{ u.submissionCount }}</td>
            <td class="px-4 py-3">
              <div v-if="u.id !== auth.user?.id" class="flex justify-end gap-1">
                <BaseButton size="sm" variant="ghost" @click="update(u, { role: u.role === 'admin' ? 'user' : 'admin' })">
                  {{ u.role === 'admin' ? 'Zu User' : 'Zu Admin' }}
                </BaseButton>
                <BaseButton size="sm" variant="ghost" @click="update(u, { disabled: !u.disabled })">
                  {{ u.disabled ? 'Entsperren' : 'Sperren' }}
                </BaseButton>
                <BaseButton size="sm" variant="ghost" @click="resetFor = u">Passwort</BaseButton>
                <BaseButton size="sm" variant="ghost" @click="toDelete = u">Löschen</BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog
      :open="toDelete !== null"
      :title="`${toDelete?.username} löschen?`"
      confirm-label="Endgültig löschen"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    >
      Alle Fotos und Kommentare dieses Benutzers werden ebenfalls gelöscht.
    </ConfirmDialog>

    <ConfirmDialog
      :open="resetFor !== null"
      :title="`Neues Passwort für ${resetFor?.username}`"
      confirm-label="Passwort setzen"
      :danger="false"
      @confirm="resetPassword"
      @cancel="resetFor = null; newPassword = ''"
    >
      <div class="mt-3">
        <BaseInput v-model="newPassword" label="Neues Passwort" type="password" autocomplete="new-password" hint="Mindestens 10 Zeichen. Alle Sitzungen des Benutzers werden beendet." />
      </div>
    </ConfirmDialog>
  </div>
</template>
