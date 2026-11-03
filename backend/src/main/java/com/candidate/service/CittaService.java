package com.candidate.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.candidate.dto.CittaDTO;
import com.candidate.entity.Citta;
import com.candidate.exception.CittaAlreadyExistsException;
import com.candidate.exception.CittaInUseException;
import com.candidate.exception.ResourceNotFoundException;
import com.candidate.mapper.CittaMapper.CittaMapper;
import com.candidate.repository.RepositoryCandidature;
import com.candidate.repository.RepositoryCitta;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class CittaService {

    private final RepositoryCitta repositoryCitta;
    private final RepositoryCandidature repositoryCandidature;
    private final CittaMapper mapper;

    public CittaDTO create (CittaDTO dto) {

        trim(dto);
        if (repositoryCitta.existsByNomeCittaIgnoreCaseAndProvinciaIgnoreCase(dto.getNomeCitta(), dto.getProvincia())) {
            throw new CittaAlreadyExistsException(dto.getNomeCitta(), dto.getProvincia());
        }

        Citta entity = mapper.toEntity(dto);
        return mapper.toDTO(repositoryCitta.save(entity));
    }

    public CittaDTO update (Long id, CittaDTO dto) {

        Citta entity = findCitta(id);

        trim(dto);
        if (repositoryCitta.existsByNomeCittaIgnoreCaseAndProvinciaIgnoreCaseAndIdNot(dto.getNomeCitta(), dto.getProvincia(), id)) {
            throw new CittaAlreadyExistsException(dto.getNomeCitta(), dto.getProvincia());
        }

        mapper.updateEntity(dto, entity);
        return mapper.toDTO(repositoryCitta.save(entity));
    }

    // una citta' usata da una candidatura non si puo' eliminare
    public void delete (Long id) {

        if (!repositoryCitta.existsById(id)) {
            throw new ResourceNotFoundException("Citta", id);
        }
        if (repositoryCandidature.existsByCittaId(id)) {
            throw new CittaInUseException(id);
        }
        repositoryCitta.deleteById(id);
    }

    @Transactional(readOnly = true)
    public CittaDTO getById (Long id) {
        return mapper.toDTO(findCitta(id));
    }

    // con "nome" restituisce solo le citta' il cui nome contiene il testo (ricerca per autocompletamento)
    @Transactional(readOnly = true)
    public List<CittaDTO> findAll (String nome) {
        List<Citta> citta = (nome == null || nome.isBlank())
            ? repositoryCitta.findAllByOrderByNomeCittaAscProvinciaAsc()
            : repositoryCitta.findByNomeCittaContainingIgnoreCaseOrderByNomeCittaAscProvinciaAsc(nome.trim());
        return citta.stream().map(mapper::toDTO).toList();
    }

    private Citta findCitta (Long id) {
        return repositoryCitta.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Citta", id));
    }

    private void trim (CittaDTO dto) {
        dto.setNomeCitta(dto.getNomeCitta().trim());
        dto.setProvincia(dto.getProvincia().trim());
        dto.setRegione(dto.getRegione().trim());
        dto.setNazione(dto.getNazione().trim());
    }
}
