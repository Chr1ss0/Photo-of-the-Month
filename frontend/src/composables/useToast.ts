import { ref } from 'vue';

export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}

const toasts = ref<Toast[]>([]);
let seq = 0;

export function useToast() {
  function show(message: string, kind: Toast['kind'] = 'info', timeout = 3500) {
    const id = ++seq;
    toasts.value.push({ id, message, kind });
    setTimeout(() => dismiss(id), timeout);
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }
  return {
    toasts,
    dismiss,
    success: (m: string) => show(m, 'success'),
    error: (m: string) => show(m, 'error', 6000),
    info: (m: string) => show(m, 'info'),
  };
}
