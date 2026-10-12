package com.tcc.gestaofrota.config;

import java.util.List;
import java.util.Map;

/**
 * Fonte unica das permissoes do sistema. O frontend monta a tela a partir
 * daqui, e o seed do banco usa a mesma lista — nao existe catalogo duplicado.
 */
public final class CatalogoPermissoes {

    public record Acao(String chave, String rotulo) {}
    public record Grupo(String chave, String rotulo, List<Acao> acoes) {}

    public static final List<Grupo> GRUPOS = List.of(
            new Grupo("dashboard", "Dashboard", List.of(
                    new Acao("dashboard.visualizar", "Visualizar painel"),
                    new Acao("dashboard.exportar", "Exportar dados")
            )),
            new Grupo("monitoramento", "Monitoramento", List.of(
                    new Acao("monitoramento.visualizar", "Visualizar mapa"),
                    new Acao("monitoramento.historico", "Ver histórico de posições")
            )),
            new Grupo("funcionarios", "Funcionários", List.of(
                    new Acao("funcionarios.visualizar", "Visualizar"),
                    new Acao("funcionarios.cadastrar", "Cadastrar"),
                    new Acao("funcionarios.editar", "Editar"),
                    new Acao("funcionarios.inativar", "Inativar")
            )),
            new Grupo("comandos", "Comandos", List.of(
                    new Acao("comandos.visualizar", "Visualizar"),
                    new Acao("comandos.bloquear", "Bloquear veículo"),
                    new Acao("comandos.desbloquear", "Desbloquear veículo")
            )),
            new Grupo("veiculos", "Veículos", List.of(
                    new Acao("veiculos.visualizar", "Lista de veículos"),
                    new Acao("veiculos.cadastrar", "Cadastrar"),
                    new Acao("veiculos.editar", "Editar"),
                    new Acao("veiculos.inativar", "Inativar"),
                    new Acao("veiculos.rotas", "Rotas"),
                    new Acao("veiculos.alertas", "Alertas"),
                    new Acao("veiculos.cercas", "Cercas")
            )),
            new Grupo("controladoras", "Controladoras", List.of(
                    new Acao("controladoras.visualizar", "Visualizar"),
                    new Acao("controladoras.cadastrar", "Cadastrar"),
                    new Acao("controladoras.editar", "Editar")
            )),
            new Grupo("cartoes", "Cartões", List.of(
                    new Acao("cartoes.visualizar", "Visualizar"),
                    new Acao("cartoes.cadastrar", "Cadastrar"),
                    new Acao("cartoes.editar", "Editar"),
                    new Acao("cartoes.vincular", "Vincular a funcionário")
            )),
            new Grupo("relatorios", "Relatórios", List.of(
                    new Acao("relatorios.visualizar", "Visualizar"),
                    new Acao("relatorios.exportar", "Exportar")
            )),
            new Grupo("configuracoes", "Configurações", List.of(
                    new Acao("configuracoes.geral", "Configurações gerais"),
                    new Acao("configuracoes.setores", "Gerenciar setores"),
                    new Acao("configuracoes.usuarios", "Gerenciar usuários"),
                    new Acao("configuracoes.permissoes", "Gerenciar permissões")
            ))
    );

    public static List<String> todasAsChaves() {
        return GRUPOS.stream()
                .flatMap(g -> g.acoes().stream())
                .map(Acao::chave)
                .toList();
    }

    public static Map<String, String> rotulosPorChave() {
        return GRUPOS.stream()
                .flatMap(g -> g.acoes().stream())
                .collect(java.util.stream.Collectors.toMap(Acao::chave, Acao::rotulo));
    }

    private CatalogoPermissoes() {}
}
