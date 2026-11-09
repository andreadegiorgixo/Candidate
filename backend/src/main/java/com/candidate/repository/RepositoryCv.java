package com.candidate.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.candidate.entity.Cv;
import com.candidate.entity.CvInfo;

// tutte le ricerche sono limitate all'account proprietario
public interface RepositoryCv extends JpaRepository<Cv, Long> {

    // proiezione chiusa: legge solo i metadati, mai il contenuto del file
    public List<CvInfo> findByAccountIdOrderByDataCaricamentoDescIdDesc(Long idAccount);

    public Optional<Cv> findByIdAndAccountId(Long id, Long idAccount);
}
