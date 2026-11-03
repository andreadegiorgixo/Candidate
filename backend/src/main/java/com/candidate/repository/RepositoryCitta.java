package com.candidate.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.candidate.entity.Citta;

public interface RepositoryCitta extends JpaRepository<Citta, Long> {

    public boolean existsByNomeCittaIgnoreCaseAndProvinciaIgnoreCase(String nomeCitta, String provincia);
    public boolean existsByNomeCittaIgnoreCaseAndProvinciaIgnoreCaseAndIdNot(String nomeCitta, String provincia, Long id);
    public List<Citta> findAllByOrderByNomeCittaAscProvinciaAsc();
    public List<Citta> findByNomeCittaContainingIgnoreCaseOrderByNomeCittaAscProvinciaAsc(String nomeCitta);
}
