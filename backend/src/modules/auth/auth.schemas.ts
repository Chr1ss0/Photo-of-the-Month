import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Benutzername muss mindestens 3 Zeichen haben')
  .max(32, 'Benutzername darf höchstens 32 Zeichen haben')
  .regex(/^[A-Za-z0-9._-]+$/, 'Nur Buchstaben, Zahlen sowie . _ - erlaubt');

export const passwordSchema = z
  .string()
  .min(10, 'Passwort muss mindestens 10 Zeichen haben')
  .max(128, 'Passwort darf höchstens 128 Zeichen haben');

export const registerSchema = z.object({ username: usernameSchema, password: passwordSchema }).strict();

export const loginSchema = z
  .object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(128) })
  .strict();

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema })
  .strict();
