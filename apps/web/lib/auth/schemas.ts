import { z } from 'zod';

const email = z.email('Informe um e-mail válido.').trim().toLowerCase();
const password = z.string().min(10, 'A senha deve ter pelo menos 10 caracteres.');

export const loginSchema = z.object({ email, password, next: z.string().optional() });
export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo.').max(120),
  email,
  password,
  accepted: z.literal('on', { error: 'Aceite os termos e a política de privacidade.' }),
});
export const recoverySchema = z.object({ email });
export const resetPasswordSchema = z.object({ password });
