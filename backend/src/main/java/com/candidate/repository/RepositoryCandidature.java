package com.candidate.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.candidate.entity.Candidature;
import java.util.List;


public interface RepositoryCandidature extends JpaRepository<Candidature, Long> {

    public List<Candidature> findByCitta(String citta);
    public List<Candidature> findByStatoCandidatura(String statoCandidatura);
    public List<Candidature> findByAzienda(String nomeAzienda);
}