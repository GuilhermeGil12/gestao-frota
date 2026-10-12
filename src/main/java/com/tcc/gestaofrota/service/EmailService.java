package com.tcc.gestaofrota.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String remetente;

    public EmailService(JavaMailSender mailSender,
                        @Value("${app.mail.remetente}") String remetente) {
        this.mailSender = mailSender;
        this.remetente = remetente;
    }

    public void enviarCodigoRecuperacao(String destinatario, String nome, String codigo, int validadeMinutos) {
        try {
            MimeMessage mensagem = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensagem, true, StandardCharsets.UTF_8.name());

            helper.setFrom(remetente, "FrotaSystem");
            helper.setTo(destinatario);
            helper.setSubject("Seu código de redefinição de senha");
            helper.setText(
                    montarTextoSimples(nome, codigo, validadeMinutos),
                    montarHtml(nome, codigo, validadeMinutos)
            );

            mailSender.send(mensagem);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            throw new RuntimeException("Não foi possível enviar o e-mail", e);
        }
    }

    private String montarTextoSimples(String nome, String codigo, int validadeMinutos) {
        return "Olá, " + nome + ".\n\n"
                + "Seu código para redefinir a senha é: " + codigo + "\n\n"
                + "Ele vale por " + validadeMinutos + " minutos e só pode ser usado uma vez.\n\n"
                + "Se você não pediu essa alteração, ignore esta mensagem.\n";
    }

    private String montarHtml(String nome, String codigo, int validadeMinutos) {
        String digitos = montarDigitos(codigo);

        return """
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

                      <tr>
                        <td style="background-color:#0f172a;padding:28px 32px;text-align:center;">
                          <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                            FrotaSystem
                          </div>
                          <div style="font-size:12px;color:#94a3b8;margin-top:4px;letter-spacing:0.5px;text-transform:uppercase;">
                            Segurança da conta
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:32px;">
                          <p style="margin:0 0 8px;font-size:16px;color:#0f172a;">Olá, <strong>%s</strong>.</p>
                          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">
                            Recebemos um pedido para redefinir a senha da sua conta. Use o código abaixo para continuar:
                          </p>

                          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 24px;">
                            <tr>%s</tr>
                          </table>

                          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-left:3px solid #0f172a;border-radius:4px;">
                            <tr>
                              <td style="padding:12px 16px;font-size:13px;color:#475569;line-height:1.5;">
                                O código expira em <strong>%d minutos</strong> e só pode ser usado uma vez.
                              </td>
                            </tr>
                          </table>

                          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                            Se você não solicitou essa alteração, ignore este e-mail — sua senha continua a mesma.
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td style="background-color:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
                          <p style="margin:0;font-size:11px;color:#94a3b8;">
                            Mensagem automática — não responda este e-mail.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(nome, digitos, validadeMinutos);
    }

    /** Cada dígito do código vira uma célula, imitando os campos da tela. */
    private String montarDigitos(String codigo) {
        StringBuilder sb = new StringBuilder();
        for (char c : codigo.toCharArray()) {
            sb.append("<td style=\"padding:0 4px;\">")
              .append("<div style=\"width:44px;height:56px;line-height:56px;background-color:#f1f5f9;")
              .append("border:1px solid #cbd5e1;border-radius:8px;text-align:center;")
              .append("font-size:26px;font-weight:700;color:#0f172a;font-family:'Courier New',monospace;\">")
              .append(c)
              .append("</div></td>");
        }
        return sb.toString();
    }
}
