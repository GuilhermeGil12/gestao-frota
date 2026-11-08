package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.dto.SetorDTO;
import com.tcc.gestaofrota.model.Permissao;
import com.tcc.gestaofrota.model.Setor;
import com.tcc.gestaofrota.repository.FuncionarioRepository;
import com.tcc.gestaofrota.repository.PermissaoRepository;
import com.tcc.gestaofrota.repository.SetorRepository;
import com.tcc.gestaofrota.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SetorService {

    private final SetorRepository setorRepository;
    private final FuncionarioRepository funcionarioRepository;
    private final UsuarioRepository usuarioRepository;
    private final PermissaoRepository permissaoRepository;

    public SetorService(SetorRepository setorRepository,
                        FuncionarioRepository funcionarioRepository,
                        UsuarioRepository usuarioRepository,
                        PermissaoRepository permissaoRepository) {
        this.setorRepository = setorRepository;
        this.funcionarioRepository = funcionarioRepository;
        this.usuarioRepository = usuarioRepository;
        this.permissaoRepository = permissaoRepository;
    }

    public List<Setor> listarSetores(){
        return setorRepository.findAll();
    }

    // Lista com as contagens e permissões, para as telas de Setores e Permissões.
    @Transactional(readOnly = true)
    public List<SetorDTO> listarResumo() {
        return setorRepository.findAll().stream()
                .sorted(Comparator.comparing(Setor::getNome, String.CASE_INSENSITIVE_ORDER))
                .map(this::paraDTO)
                .collect(Collectors.toList());
    }

    private SetorDTO paraDTO(Setor setor) {
        return new SetorDTO(
                setor.getId(),
                setor.getNome(),
                setor.getDescricao(),
                setor.isAtivo(),
                funcionarioRepository.countBySetorId(setor.getId()),
                usuarioRepository.findByFuncionario_Setor_Id(setor.getId()).size(),
                setor.getPermissoes().stream().map(Permissao::getNomePermissao).sorted().collect(Collectors.toList())
        );
    }

    public Setor buscarPorId(Long id) {
        return setorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Setor não encontrado!"));
    }

    public Setor salvar(Setor setor) {
        if (setor.getNome() == null || setor.getNome().isBlank()) {
         throw new RuntimeException("Setor não cadastrado! Necessário inserir o nome do setor.");
        }
        setor.setNome(setor.getNome().trim());

        Optional<Setor> setorSalvo = setorRepository.findByNome(setor.getNome());
        if(setorSalvo.isPresent()){
            throw new RuntimeException("Já existe um setor com esse nome cadastrado!");
        }

        setor.setId(null);
        setor.setAtivo(true);
        setor.setCriadoEm(LocalDateTime.now());
        Setor salvo = setorRepository.save(setor);
        System.out.println("Setor " + setor.getNome() +  " salvo com sucesso!");
        return salvo;
    }

    public Setor atualizar(Long id, Setor dados) {
        Setor setor = buscarPorId(id);
        if (dados.getNome() == null || dados.getNome().isBlank()) {
            throw new RuntimeException("Necessário inserir o nome do setor.");
        }
        String nome = dados.getNome().trim();
        Optional<Setor> mesmoNome = setorRepository.findByNome(nome);
        if (mesmoNome.isPresent() && !mesmoNome.get().getId().equals(id)) {
            throw new RuntimeException("Já existe um setor com esse nome cadastrado!");
        }

        setor.setNome(nome);
        setor.setDescricao(dados.getDescricao());
        setor.setAtualizadoEm(LocalDateTime.now());
        return setorRepository.save(setor);
    }

    public Setor alternarAtivo(Long id) {
        Setor setor = buscarPorId(id);
        setor.setAtivo(!setor.isAtivo());
        setor.setAtualizadoEm(LocalDateTime.now());
        return setorRepository.save(setor);
    }

    // Papel inicial do setor: as permissões com que um usuário NOVO desse setor começa.
    // Não mexe nos usuários que já existem (esses são ajustados um a um na tela de Usuários).
    @Transactional
    public SetorDTO salvarPermissoes(Long id, Collection<String> chaves) {
        Setor setor = buscarPorId(id);
        Set<String> nomes = chaves == null ? Set.of() : new HashSet<>(chaves);
        setor.setPermissoes(nomes.isEmpty() ? new HashSet<>() : new HashSet<>(permissaoRepository.findByNomePermissaoIn(nomes)));
        setor.setAtualizadoEm(LocalDateTime.now());
        return paraDTO(setorRepository.save(setor));
    }

    // Papel inicial do setor de um funcionário (vazio se não tiver setor). Usado ao criar usuário.
    @Transactional(readOnly = true)
    public Set<Permissao> permissoesDoSetor(Long idSetor) {
        if (idSetor == null) return new HashSet<>();
        return setorRepository.findById(idSetor)
                .map(s -> new HashSet<>(s.getPermissoes()))
                .orElseGet(HashSet::new);
    }
}
