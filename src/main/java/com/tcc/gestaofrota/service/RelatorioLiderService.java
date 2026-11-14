package com.tcc.gestaofrota.service;

import com.tcc.gestaofrota.model.CartaoRfid;
import com.tcc.gestaofrota.model.Funcionario;
import com.tcc.gestaofrota.model.Localizacao;
import com.tcc.gestaofrota.model.Usuario;
import com.tcc.gestaofrota.repository.CartaoRfidRepository;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import com.tcc.gestaofrota.repository.LocalizacaoRepository;
import com.tcc.gestaofrota.repository.UsuarioRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/**
 * Relatório semanal de condução para os líderes.
 *
 * Toda segunda às 7h (horário de Brasília) cada líder recebe por e-mail a condução
 * da semana anterior (segunda a domingo) dos SEUS liderados. Liderado = funcionário
 * cujo líder direto é ele ou, sem líder direto, cujo setor tem ele como líder.
 * Depois do e-mail, quem conectou o Telegram recebe um aviso de que o relatório chegou.
 *
 * O motorista de cada ponto vem do cartão (UID) gravado no ponto.
 */
@Service
public class RelatorioLiderService {

    public static final String FUSO = "America/Sao_Paulo";
    private static final ZoneId ZONA = ZoneId.of(FUSO);
    private static final DateTimeFormatter DATA_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final double LIMITE_PADRAO = 110;
    private static final double VELOCIDADE_PARADO = 3;
    private static final long INTERVALO_MAXIMO_SEGUNDOS = 300;

    private final FuncionarioRepository funcionarioRepository;
    private final LocalizacaoRepository localizacaoRepository;
    private final CartaoRfidRepository cartaoRfidRepository;
    private final UsuarioRepository usuarioRepository;
    private final EmailService emailService;
    private final TelegramService telegramService;
    private final PerfilService perfilService;
    private final AtividadeService atividadeService;
    private final ConfiguracaoService configuracaoService;

    public RelatorioLiderService(FuncionarioRepository funcionarioRepository,
                                 LocalizacaoRepository localizacaoRepository,
                                 CartaoRfidRepository cartaoRfidRepository,
                                 UsuarioRepository usuarioRepository,
                                 EmailService emailService,
                                 TelegramService telegramService,
                                 PerfilService perfilService,
                                 AtividadeService atividadeService,
                                 ConfiguracaoService configuracaoService) {
        this.funcionarioRepository = funcionarioRepository;
        this.localizacaoRepository = localizacaoRepository;
        this.cartaoRfidRepository = cartaoRfidRepository;
        this.usuarioRepository = usuarioRepository;
        this.emailService = emailService;
        this.telegramService = telegramService;
        this.perfilService = perfilService;
        this.atividadeService = atividadeService;
        this.configuracaoService = configuracaoService;
    }

    /** O que aconteceu com cada líder (volta para a tela, no envio manual de teste). */
    public record ResultadoEnvio(String lider, String email, int liderados, boolean enviado, boolean telegram, String erro) {}

    // ===================== AGENDAMENTO =====================

    // @Transactional: roda fora de uma requisição, e os líderes/setores são carregados sob demanda.
    @Scheduled(cron = "0 0 7 * * MON", zone = FUSO)
    @Transactional
    public void enviarSemanal() {
        LocalDate[] semana = semanaPassada();
        List<ResultadoEnvio> r = enviar(semana[0], semana[1]);
        System.out.println("[Relatório líderes] semana " + semana[0] + " a " + semana[1] + ": "
                + r.stream().filter(ResultadoEnvio::enviado).count() + " de " + r.size() + " enviados.");
    }

    /** Segunda a domingo da semana anterior a hoje. */
    public LocalDate[] semanaPassada() {
        LocalDate segundaDestaSemana = LocalDate.now(ZONA).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return new LocalDate[]{segundaDestaSemana.minusWeeks(1), segundaDestaSemana.minusDays(1)};
    }

    // ===================== ENVIO =====================

    @Transactional
    public List<ResultadoEnvio> enviar(LocalDate inicio, LocalDate fim) {
        // 1. Quem lidera quem.
        Map<Long, Funcionario> lideres = new LinkedHashMap<>();
        Map<Long, List<Funcionario>> lideradosPorLider = new HashMap<>();
        for (Funcionario f : funcionarioRepository.findByAtivoTrue()) {
            Funcionario lider = f.liderEfetivo();
            if (lider == null || !Boolean.TRUE.equals(lider.getAtivo())) continue;
            lideres.putIfAbsent(lider.getId(), lider);
            lideradosPorLider.computeIfAbsent(lider.getId(), k -> new ArrayList<>()).add(f);
        }
        if (lideres.isEmpty()) return List.of();

        // 2. Condução de cada motorista no período.
        Map<Long, Conducao> conducao = calcularConducao(inicio.atStartOfDay(), fim.atTime(23, 59, 59));

        // 3. Um e-mail por líder.
        String periodo = inicio.format(DATA_BR) + " a " + fim.format(DATA_BR);
        String empresa = configuracaoService.buscar().getNomeEmpresa();
        List<ResultadoEnvio> resultados = new ArrayList<>();

        for (Funcionario lider : lideres.values()) {
            List<Funcionario> liderados = lideradosPorLider.get(lider.getId());
            liderados.sort(Comparator.comparing(Funcionario::getNome, String.CASE_INSENSITIVE_ORDER));

            if (lider.getEmail() == null || lider.getEmail().isBlank()) {
                resultados.add(new ResultadoEnvio(lider.getNome(), null, liderados.size(), false, false, "Líder sem e-mail cadastrado"));
                continue;
            }
            try {
                emailService.enviarHtml(lider.getEmail(),
                        "Relatório semanal de condução — " + periodo,
                        montarTexto(lider, liderados, conducao, periodo),
                        montarHtml(lider, liderados, conducao, periodo, empresa));
                boolean telegram = avisarNoTelegram(lider, periodo);
                resultados.add(new ResultadoEnvio(lider.getNome(), lider.getEmail(), liderados.size(), true, telegram, null));
            } catch (Exception e) {
                resultados.add(new ResultadoEnvio(lider.getNome(), lider.getEmail(), liderados.size(), false, false, e.getMessage()));
            }
        }

        long enviados = resultados.stream().filter(ResultadoEnvio::enviado).count();
        atividadeService.registrar("RELATORIO", "Relatório semanal (" + periodo + ") enviado para "
                + enviados + " de " + resultados.size() + " líder(es)");
        return resultados;
    }

    private boolean avisarNoTelegram(Funcionario lider, String periodo) {
        Optional<Usuario> usuario = usuarioRepository.findByFuncionarioId(lider.getId());
        if (usuario.isEmpty() || usuario.get().getTelegramChatId() == null) return false;
        if (perfilService.notificacoesDesativadas(usuario.get()).contains("RELATORIO_SEMANAL")) return false;
        return telegramService.enviar(usuario.get().getTelegramChatId(),
                "📊 <b>Relatório semanal disponível</b>\nA condução da sua equipe de " + periodo
                + " foi enviada para o seu e-mail <b>" + TelegramService.esc(lider.getEmail()) + "</b>.");
    }

    // ===================== CÁLCULO =====================

    /** Totais de um motorista no período. */
    static class Conducao {
        double km;
        long segundosEmMovimento;
        double velocidadeMaxima;
        int excessos, freadas, aceleracoes, viradasBruscas;
        final Set<String> veiculos = new TreeSet<>();
        final Set<LocalDate> dias = new TreeSet<>();
    }

    private Map<Long, Conducao> calcularConducao(LocalDateTime inicio, LocalDateTime fim) {
        // Cartão (UID) → id do funcionário.
        Map<String, Long> donoDoCartao = new HashMap<>();
        for (CartaoRfid c : cartaoRfidRepository.findAll()) {
            if (c.getUid() != null && c.getFuncionario() != null) {
                donoDoCartao.put(c.getUid().replace(" ", "").toUpperCase(), c.getFuncionario().getId());
            }
        }

        Map<Long, List<Localizacao>> porVeiculo = new LinkedHashMap<>();
        for (Localizacao p : localizacaoRepository.findByDataHoraBetweenOrderByDataHoraAsc(inicio, fim)) {
            if (p.getVeiculo() != null) porVeiculo.computeIfAbsent(p.getVeiculo().getId(), k -> new ArrayList<>()).add(p);
        }

        Map<Long, Conducao> resultado = new HashMap<>();
        for (List<Localizacao> pontos : porVeiculo.values()) {
            double limite = pontos.get(0).getVeiculo().getVelocidadeMaxima() != null && pontos.get(0).getVeiculo().getVelocidadeMaxima() > 0
                    ? pontos.get(0).getVeiculo().getVelocidadeMaxima() : LIMITE_PADRAO;
            Long motoristaAnterior = null;
            boolean estavaAcima = false;

            for (int i = 0; i < pontos.size(); i++) {
                Localizacao p = pontos.get(i);
                Long motorista = donoDoCartao.get(uidDoPonto(p.getMotorista()));
                double v = p.getVelocidade() != null ? p.getVelocidade() : 0;
                // Trocou de motorista: o excesso do anterior não conta pro novo.
                if (!Objects.equals(motorista, motoristaAnterior)) estavaAcima = false;
                motoristaAnterior = motorista;
                if (motorista == null) continue;

                Conducao c = resultado.computeIfAbsent(motorista, k -> new Conducao());
                c.velocidadeMaxima = Math.max(c.velocidadeMaxima, v);
                c.veiculos.add(p.getVeiculo().getPlaca());
                if (p.getDataHora() != null) c.dias.add(p.getDataHora().toLocalDate());

                // Excesso começa acima do limite e só termina 5 km/h abaixo (oscilar não conta de novo).
                if (!estavaAcima && v > limite) {
                    c.excessos++;
                    estavaAcima = true;
                } else if (estavaAcima && v < limite - 5) {
                    estavaAcima = false;
                }

                if ("FREADA".equals(p.getEvento())) c.freadas++;
                else if ("ACELERACAO".equals(p.getEvento())) c.aceleracoes++;
                else if ("VIRADA_BRUSCA".equals(p.getEvento())) c.viradasBruscas++;

                // Distância e tempo até o próximo ponto, se o próximo é do mesmo motorista.
                if (i + 1 < pontos.size()) {
                    Localizacao q = pontos.get(i + 1);
                    if (!Objects.equals(motorista, donoDoCartao.get(uidDoPonto(q.getMotorista())))) continue;
                    if (p.getLatitude() != null && q.getLatitude() != null) {
                        c.km += distanciaKm(p.getLatitude(), p.getLongitude(), q.getLatitude(), q.getLongitude());
                    }
                    if (v >= VELOCIDADE_PARADO && p.getDataHora() != null && q.getDataHora() != null) {
                        long s = Duration.between(p.getDataHora(), q.getDataHora()).getSeconds();
                        if (s > 0 && s <= INTERVALO_MAXIMO_SEGUNDOS) c.segundosEmMovimento += s;
                    }
                }
            }
        }
        return resultado;
    }

    // O ponto guarda "Nome | Cartão: UID"; o UID é o que identifica o motorista.
    private String uidDoPonto(String motorista) {
        if (motorista == null) return null;
        int i = motorista.indexOf("Cartão:");
        String uid = i >= 0 ? motorista.substring(i + 7) : motorista;
        uid = uid.replace(" ", "").toUpperCase();
        return uid.isEmpty() ? null : uid;
    }

    private double distanciaKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ===================== E-MAIL =====================

    private static String esc(String t) {
        if (t == null) return "";
        return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String duracao(long segundos) {
        long min = Math.round(segundos / 60.0);
        if (min < 60) return min + " min";
        return (min / 60) + " h " + (min % 60) + " min";
    }

    private String montarTexto(Funcionario lider, List<Funcionario> liderados, Map<Long, Conducao> conducao, String periodo) {
        StringBuilder sb = new StringBuilder("Olá, " + lider.getNome() + ".\n\nCondução da sua equipe de " + periodo + ":\n\n");
        for (Funcionario f : liderados) {
            Conducao c = conducao.get(f.getId());
            if (c == null) {
                sb.append("- ").append(f.getNome()).append(": sem condução no período\n");
            } else {
                sb.append("- ").append(f.getNome()).append(": ")
                        .append(String.format(Locale.forLanguageTag("pt-BR"), "%.1f km", c.km)).append(", ")
                        .append(duracao(c.segundosEmMovimento)).append(" em movimento, máx. ")
                        .append(Math.round(c.velocidadeMaxima)).append(" km/h, ")
                        .append(c.excessos).append(" excesso(s), ")
                        .append(c.freadas).append(" freada(s), ")
                        .append(c.aceleracoes).append(" aceleração(ões), ")
                        .append(c.viradasBruscas).append(" virada(s) brusca(s)\n");
            }
        }
        return sb.append("\nMensagem automática do FrotaSystem.\n").toString();
    }

    private String montarHtml(Funcionario lider, List<Funcionario> liderados, Map<Long, Conducao> conducao,
                              String periodo, String empresa) {
        StringBuilder linhas = new StringBuilder();
        int comConducao = 0, totalExcessos = 0, totalEventos = 0;
        double totalKm = 0;

        for (Funcionario f : liderados) {
            Conducao c = conducao.get(f.getId());
            String td = "padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;";
            if (c == null) {
                linhas.append("<tr><td style=\"").append(td).append("\"><strong>").append(esc(f.getNome())).append("</strong></td>")
                      .append("<td colspan=\"6\" style=\"").append(td).append("color:#94a3b8;\">Sem condução no período</td></tr>");
                continue;
            }
            comConducao++;
            totalKm += c.km;
            totalExcessos += c.excessos;
            int eventos = c.freadas + c.aceleracoes + c.viradasBruscas;
            totalEventos += eventos;
            String alerta = "color:#dc2626;font-weight:700;";
            linhas.append("<tr>")
                  .append("<td style=\"").append(td).append("\"><strong>").append(esc(f.getNome())).append("</strong><br>")
                  .append("<span style=\"font-size:11px;color:#64748b;\">").append(esc(String.join(", ", c.veiculos)))
                  .append(" · ").append(c.dias.size()).append(" dia(s)</span></td>")
                  .append("<td style=\"").append(td).append("text-align:right;\">").append(String.format(Locale.forLanguageTag("pt-BR"), "%.1f", c.km)).append(" km</td>")
                  .append("<td style=\"").append(td).append("text-align:right;\">").append(duracao(c.segundosEmMovimento)).append("</td>")
                  .append("<td style=\"").append(td).append("text-align:right;\">").append(Math.round(c.velocidadeMaxima)).append(" km/h</td>")
                  .append("<td style=\"").append(td).append("text-align:center;").append(c.excessos > 0 ? alerta : "").append("\">").append(c.excessos).append("</td>")
                  .append("<td style=\"").append(td).append("text-align:center;").append(eventos > 0 ? alerta : "").append("\">")
                  .append(c.freadas).append(" / ").append(c.aceleracoes).append(" / ").append(c.viradasBruscas).append("</td>")
                  .append("</tr>");
        }

        String th = "padding:8px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #e2e8f0;";
        return """
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 12px;">
                <tr><td align="center">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:720px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
                    <tr><td style="background-color:#0f172a;padding:24px 28px;">
                      <div style="font-size:20px;font-weight:700;color:#ffffff;">%s</div>
                      <div style="font-size:12px;color:#94a3b8;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Relatório semanal de condução · %s</div>
                    </td></tr>
                    <tr><td style="padding:24px 28px 8px;">
                      <p style="margin:0 0 6px;font-size:15px;color:#0f172a;">Olá, <strong>%s</strong>.</p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
                        Veja como foi a condução da sua equipe: <strong>%d</strong> de <strong>%d</strong> pessoa(s) dirigiram,
                        <strong>%s km</strong> no total, <strong>%d</strong> excesso(s) de velocidade e <strong>%d</strong> evento(s) de condução brusca.
                      </p>
                    </td></tr>
                    <tr><td style="padding:16px 20px 24px;">
                      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
                        <tr>
                          <th align="left" style="%s">Motorista</th>
                          <th align="right" style="%s">Distância</th>
                          <th align="right" style="%s">Em movimento</th>
                          <th align="right" style="%s">Vel. máx.</th>
                          <th align="center" style="%s">Excessos</th>
                          <th align="center" style="%s">Freadas / Acel. / Viradas</th>
                        </tr>
                        %s
                      </table>
                    </td></tr>
                    <tr><td style="background-color:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;">
                      <p style="margin:0;font-size:11px;color:#94a3b8;">
                        Mensagem automática — enviada toda segunda às 7h. Os detalhes de cada viagem estão em Relatórios, no FrotaSystem.
                      </p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(esc(empresa), periodo, esc(lider.getNome()), comConducao, liderados.size(),
                String.format(Locale.forLanguageTag("pt-BR"), "%.1f", totalKm), totalExcessos, totalEventos,
                th, th, th, th, th, th, linhas.toString());
    }
}
