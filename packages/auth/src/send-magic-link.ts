import { Resend } from "resend";

export async function sendMagicLinkEmail(input: {
  email: string;
  from: string;
  resendApiKey: string;
  url: string;
}): Promise<void> {
  const resend = new Resend(input.resendApiKey);
  const { error } = await resend.emails.send({
    from: input.from,
    html: `
      <div style="font-family: system-ui, sans-serif; line-height: 1.5; max-width: 480px;">
        <h1 style="font-size: 20px; margin: 0 0 12px;">Entrar no PersonalOS</h1>
        <p style="margin: 0 0 16px; color: #444;">
          Clique no botão abaixo para acessar sua conta. O link expira em alguns minutos.
        </p>
        <p style="margin: 0 0 24px;">
          <a href="${input.url}"
             style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
            Continuar para o PersonalOS
          </a>
        </p>
        <p style="margin: 0; color: #777; font-size: 12px;">
          Se você não solicitou este e-mail, pode ignorá-lo.
        </p>
      </div>
    `,
    subject: "Seu link de acesso ao PersonalOS",
    text: `Entrar no PersonalOS: ${input.url}`,
    to: input.email,
  });

  if (error) {
    throw new Error(error.message || "Failed to send magic link email");
  }
}
