# E-mails de autenticação MEDHELP

Os arquivos em `supabase/templates/` são a fonte dos modelos de confirmação e recuperação. `supabase/config.toml` aplica esses modelos somente ao ambiente local. No projeto hospedado, o conteúdo e o remetente são configurados em **Supabase → Authentication**.

## Ativação no projeto hospedado

1. Verifique um domínio de envio no Resend, preferencialmente um subdomínio exclusivo de autenticação, como `auth.<domínio MEDHELP>`. Configure os registros DNS solicitados pelo provedor. Não use o domínio `vercel.app` como remetente.
2. Em **Supabase → Authentication → SMTP Settings**, habilite SMTP personalizado com o host, porta, usuário e senha fornecidos pelo Resend; defina o remetente `MEDHELP` e um endereço do domínio verificado. Armazene a chave somente nas configurações protegidas do provedor.
3. Em **Authentication → Email Templates**, atualize **Confirm sign up** com o assunto `Confirme seu e-mail e comece a estudar | MEDHELP` e o HTML de `supabase/templates/confirmation.html`. Atualize **Reset password** com o assunto `Redefina sua senha | MEDHELP` e o HTML de `supabase/templates/recovery.html`. Preserve `{{ .ConfirmationURL }}` sem alterar o formato.
4. Confira **Site URL** e os destinos permitidos de redirecionamento para `https://medhelp-web.vercel.app/auth/callback`; mantenha a confirmação de e-mail ativa.
5. Teste com uma conta nova e com a recuperação de senha em um endereço externo à equipe. Verifique o nome do remetente, os dois assuntos, a leitura no celular e o destino final depois do clique. Não use links já abertos, pois são de uso único.

Projetos gratuitos criados a partir de junho de 2026 que usam o SMTP padrão do Supabase não podem personalizar esses modelos. O SMTP padrão também restringe destinatários e volume, por isso os arquivos versionados **não** mudam os e-mails hospedados até a configuração acima.

Referências: [modelos de e-mail](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP personalizado](https://supabase.com/docs/guides/auth/auth-smtp), [mudança no plano gratuito](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).
