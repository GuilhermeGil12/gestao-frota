package com.tcc.gestaofrota.service;


import com.tcc.gestaofrota.model.Permissao;
import com.tcc.gestaofrota.repository.PermissaoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PermissaoService {

    private final PermissaoRepository permissaoRepository;

    public PermissaoService(PermissaoRepository permissaoRepository) {
        this.permissaoRepository = permissaoRepository;
    }

    public Permissao salvar(Permissao permissao){

        Optional<Permissao> jaExiste = permissaoRepository.findByNomePermissao(permissao.getNomePermissao());

        if(jaExiste.isPresent()){
            throw new RuntimeException("Já possui uma permissão com esse nome cadastrado!");
        }
        return permissaoRepository.save(permissao);
    }

    public List<Permissao> listarTodas(){
        return  permissaoRepository.findAll();
    }

    public Permissao buscarPorId(Long id){
        Optional<Permissao> caixaMisteriosa = permissaoRepository.findById(id);

        if (caixaMisteriosa.isEmpty()){
            throw new RuntimeException("Permissão não encontrada no banco de dados!");
        }
        //Se a caixa não está vazia, nós pegamos a permissão lá de dentro e devolvemos
        return caixaMisteriosa.get();
    }

    public Permissao atualizar(Long id, Permissao permissaoNova){

        Permissao permissaoAntiga = buscarPorId(id);

        permissaoAntiga.setNomePermissao(permissaoNova.getNomePermissao());

        return  permissaoRepository.save(permissaoAntiga);
    }

    public void deletar(Long id){
        buscarPorId(id);

        permissaoRepository.deleteById(id);
    }
}
