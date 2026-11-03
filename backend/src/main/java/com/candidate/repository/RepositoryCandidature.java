package com.candidate.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.candidate.entity.Candidature;
import com.candidate.entity.StatoCandidatura;

// tutte le ricerche sono limitate all'account proprietario; la citta' viene caricata in join (niente N+1)
public interface RepositoryCandidature extends JpaRepository<Candidature, Long> {

    @EntityGraph(attributePaths = "citta")
    public Optional<Candidature> findByIdAndAccountId(Long id, Long idAccount);

    @EntityGraph(attributePaths = "citta")
    public List<Candidature> findByAccountIdOrderByDataCandidaturaDescIdDesc(Long idAccount);

    @EntityGraph(attributePaths = "citta")
    public List<Candidature> findByAccountIdAndCittaNomeCittaIgnoreCaseOrderByDataCandidaturaDescIdDesc(Long idAccount, String nomeCitta);

    @EntityGraph(attributePaths = "citta")
    public List<Candidature> findByAccountIdAndStatoCandidaturaOrderByDataCandidaturaDescIdDesc(Long idAccount, StatoCandidatura statoCandidatura);

    @EntityGraph(attributePaths = "citta")
    public List<Candidature> findByAccountIdAndNomeAziendaContainingIgnoreCaseOrderByDataCandidaturaDescIdDesc(Long idAccount, String nomeAzienda);

    public boolean existsByCittaId(Long idCitta);
}
