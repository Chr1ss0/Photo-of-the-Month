import { z } from 'zod';
import { badRequest } from './errors.js';

/** Validiert Daten gegen ein Zod-Schema und wirft einen 400-Fehler bei Problemen. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(
      'Ungültige Eingabe',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}

/** Positive Integer-ID aus Routenparametern. */
export const idParam = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

/** Text ohne Steuerzeichen (außer Zeilenumbrüchen/Tabs), getrimmt. */
export const cleanText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim())
    .pipe(z.string().max(max));
