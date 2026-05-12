import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly from: string;
  private readonly contactTo: string | undefined;
  private readonly dashboardUrl: string;

  constructor(private config: ConfigService) {
    const key = config.get<string>("RESEND_API_KEY");
    if (key) {
      this.resend = new Resend(key);
    } else {
      this.logger.warn("RESEND_API_KEY missing — emails will log instead of send");
    }
    this.from = config.get<string>("EMAIL_FROM") ?? "Vestra <noreply@vestra-financas.com.br>";
    this.contactTo = config.get<string>("EMAIL_TO") || undefined;
    this.dashboardUrl = config.get<string>("DASHBOARD_URL") ?? "http://localhost:5173";
  }

  private async send(args: SendArgs) {
    if (!this.resend) {
      this.logger.log(
        `[email:dry] to=${Array.isArray(args.to) ? args.to.join(",") : args.to} subject="${args.subject}"`,
      );
      return { id: "dry-run" };
    }
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });
    if (error) {
      this.logger.error(`Resend failed: ${error.name} - ${error.message}`);
      throw new Error(`Email send failed: ${error.message}`);
    }
    return { id: data?.id ?? "unknown" };
  }

  async sendConfirmationCode(to: string, code: string) {
    return this.send({
      to,
      subject: "Vestra — código de confirmação",
      text: `Seu código de confirmação Vestra é: ${code}\n\nO código expira em 5 minutos.`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Bem-vindo ao Vestra</h2>
          <p>Use o código abaixo para confirmar seu cadastro:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center;
                      padding: 16px; background: #f4f4f5; border-radius: 12px; margin: 16px 0;">
            ${code}
          </div>
          <p style="color: #71717a; font-size: 14px;">O código expira em 5 minutos.</p>
        </div>
      `,
    });
  }

  async sendPasswordReset(to: string, token: string) {
    const link = `${this.dashboardUrl}/reset-password?token=${encodeURIComponent(token)}`;
    return this.send({
      to,
      subject: "Vestra — redefinição de senha",
      text: `Para redefinir sua senha, acesse: ${link}\n\nO link expira em 30 minutos. Ignore caso não tenha solicitado.`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Redefinir senha</h2>
          <p>Clique no botão abaixo para escolher uma nova senha:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${link}"
               style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 12px;
                      text-decoration: none; font-weight: 600;">
              Redefinir senha
            </a>
          </p>
          <p style="color: #71717a; font-size: 14px;">
            Link expira em 30 minutos. Ignore caso não tenha solicitado.
          </p>
        </div>
      `,
    });
  }

  async sendContactForm(payload: {
    name: string;
    email: string;
    phone?: string;
    message: string;
  }) {
    if (!this.contactTo) {
      this.logger.warn("EMAIL_TO missing — contact form not forwarded");
      return { id: "no-recipient" };
    }
    return this.send({
      to: this.contactTo,
      replyTo: payload.email,
      subject: `Vestra — nova mensagem de ${payload.name}`,
      text: [
        `Nome: ${payload.name}`,
        `Email: ${payload.email}`,
        payload.phone ? `Telefone: ${payload.phone}` : null,
        "",
        payload.message,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h3>Nova mensagem do site Vestra</h3>
          <p><strong>Nome:</strong> ${escape(payload.name)}</p>
          <p><strong>Email:</strong> ${escape(payload.email)}</p>
          ${payload.phone ? `<p><strong>Telefone:</strong> ${escape(payload.phone)}</p>` : ""}
          <hr />
          <p style="white-space: pre-wrap;">${escape(payload.message)}</p>
        </div>
      `,
    });
  }
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
