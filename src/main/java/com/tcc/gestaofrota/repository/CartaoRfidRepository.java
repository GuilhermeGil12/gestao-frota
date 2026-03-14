package com.tcc.gestaofrota.repository;


import com.tcc.gestaofrota.model.CartaoRfid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartaoRfidRepository extends JpaRepository<CartaoRfid, Long> {

    // Este metodo faz o Spring criar um:
    // "SELECT * FROM cartao_rfid WHERE uid = ?"
   Optional<CartaoRfid> findByUid(String uid);

   Optional<CartaoRfid> findById(Long id);

   List<CartaoRfid> findByFuncionarioId(Long id);

   List<CartaoRfid> findByAtivoTrue();

    List<CartaoRfid> findByFuncionarioIdAndAtivoTrue(Long funcionarioId);





}
