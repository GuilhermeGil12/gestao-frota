package com.tcc.gestaofrota.repository;

import com.tcc.gestaofrota.model.Localizacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Date;
import java.util.Optional;

public interface LocalizacaoRepository extends JpaRepository <Localizacao, Long> {

    // Aqui o Spring injeta automaticamente comandos como save(), findAll(), findById(), etc.
     Optional<Localizacao> findByVeiculoId(Long id);

    Optional<Localizacao> findByMotorista(String motorista);

    //buscar pela data
    Optional<Localizacao> findByDataHora(Date dataHora);



    /*findTop: Busque apenas o PRIMEIRO resultado (Limit 1).

    ByVeiculoId: Onde o ID do veículo seja igual ao número que eu passar.

    OrderByDataHoraDesc: Organize pela data e hora do GPS, do mais novo para o mais velho (Decrescente).

    Optional<>: Como vimos antes, é a nossa "Caixa Misteriosa". Se o carro for zero km e nunca tiver andado, a caixa volta vazia e não quebra o sistema.

     */

    Optional<Localizacao> findTopByVeiculoIdOrderByDataHoraDesc(Long veiculoId);

}
