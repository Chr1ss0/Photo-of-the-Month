import { ref } from 'vue';
import { errorMessage } from '@/api/http';

/** Kapselt Lade- und Fehlerzustand eines asynchronen Aufrufs. */
export function useAsync() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    loading.value = true;
    error.value = null;
    try {
      return await fn();
    } catch (err) {
      error.value = errorMessage(err);
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, run };
}
