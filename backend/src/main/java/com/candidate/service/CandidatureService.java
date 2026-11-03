package com.candidate.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.candidate.dto.CandidatureDTO;
import com.candidate.entity.Account;
import com.candidate.entity.Candidature;
import com.candidate.entity.Citta;
import com.candidate.entity.StatoCandidatura;
import com.candidate.exception.BadRequestException;
import com.candidate.exception.ResourceNotFoundException;
import com.candidate.mapper.CandidatureMapper.CandidatureMapper;
import com.candidate.repository.RepositoryAccount;
import com.candidate.repository.RepositoryCandidature;
import com.candidate.repository.RepositoryCitta;

import lombok.RequiredArgsConstructor;

/**
 * Ogni operazione e' limitata alle candidature dell'account indicato:
 * una candidatura di un altro account risulta "non trovata".
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CandidatureService {

    private final RepositoryCandidature repositoryCandidature;
    private final RepositoryAccount repositoryAccount;
    private final RepositoryCitta repositoryCitta;
    private final CandidatureMapper mapper;

    // idAccount del dto viene ignorato: la candidatura appartiene all'account indicato
    public CandidatureDTO create (Long idAccount, CandidatureDTO dto) {

        Candidature entity = mapper.toEntity(dto);
        entity.setAccount(findAccount(idAccount));
        entity.setCitta(findCitta(dto));
        return mapper.toDTO(repositoryCandidature.save(entity));
    }

    public CandidatureDTO update (Long idAccount, Long id, CandidatureDTO dto) {

        Candidature entity = findCandidature(idAccount, id);
        mapper.updateEntity(dto, entity);
        entity.setCitta(findCitta(dto));
        return mapper.toDTO(repositoryCandidature.save(entity));
    }

    public CandidatureDTO updateStato (Long idAccount, Long id, StatoCandidatura statoCandidatura) {

        Candidature entity = findCandidature(idAccount, id);
        entity.setStatoCandidatura(statoCandidatura);
        return mapper.toDTO(repositoryCandidature.save(entity));
    }

    public void delete (Long idAccount, Long id) {

        repositoryCandidature.delete(findCandidature(idAccount, id));
    }

    @Transactional(readOnly = true)
    public CandidatureDTO getById (Long idAccount, Long id) {
        return mapper.toDTO(findCandidature(idAccount, id));
    }

    // dalla piu' recente
    @Transactional(readOnly = true)
    public List<CandidatureDTO> findAll (Long idAccount) {
        return toDTOs(repositoryCandidature.findByAccountIdOrderByDataCandidaturaDescIdDesc(idAccount));
    }

    @Transactional(readOnly = true)
    public List<CandidatureDTO> findByCitta (Long idAccount, String nomeCitta) {
        return toDTOs(repositoryCandidature
            .findByAccountIdAndCittaNomeCittaIgnoreCaseOrderByDataCandidaturaDescIdDesc(idAccount, nomeCitta.trim()));
    }

    @Transactional(readOnly = true)
    public List<CandidatureDTO> findByStatoCandidatura (Long idAccount, StatoCandidatura statoCandidatura) {
        return toDTOs(repositoryCandidature
            .findByAccountIdAndStatoCandidaturaOrderByDataCandidaturaDescIdDesc(idAccount, statoCandidatura));
    }

    // il nome azienda e' cercato per contenuto, senza distinguere maiuscole/minuscole
    @Transactional(readOnly = true)
    public List<CandidatureDTO> findByAzienda (Long idAccount, String nomeAzienda) {
        return toDTOs(repositoryCandidature
            .findByAccountIdAndNomeAziendaContainingIgnoreCaseOrderByDataCandidaturaDescIdDesc(idAccount, nomeAzienda.trim()));
    }

    private List<CandidatureDTO> toDTOs (List<Candidature> candidature) {
        return candidature.stream().map(mapper::toDTO).toList();
    }

    private Candidature findCandidature (Long idAccount, Long id) {
        return repositoryCandidature.findByIdAndAccountId(id, idAccount)
            .orElseThrow(() -> new ResourceNotFoundException("Candidatura", id));
    }

    private Account findAccount (Long id) {
        return repositoryAccount.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Account", id));
    }

    private Citta findCitta (CandidatureDTO dto) {
        if (dto.getCitta() == null || dto.getCitta().getId() == null) {
            throw new BadRequestException("La citta' e' obbligatoria: indicare citta.id");
        }
        return repositoryCitta.findById(dto.getCitta().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Citta", dto.getCitta().getId()));
    }
}
