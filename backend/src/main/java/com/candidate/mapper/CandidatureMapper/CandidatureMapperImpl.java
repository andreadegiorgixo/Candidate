package com.candidate.mapper.CandidatureMapper;

import org.springframework.stereotype.Component;

import com.candidate.dto.CandidatureDTO;
import com.candidate.entity.Candidature;
import com.candidate.mapper.CittaMapper.CittaMapper;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CandidatureMapperImpl implements CandidatureMapper {

    private final CittaMapper cittaMapper;

    @Override
    public CandidatureDTO toDTO(Candidature candidature) {
        if (candidature == null) {
            return null;
        }
        CandidatureDTO dto = new CandidatureDTO();
        dto.setId(candidature.getId());
        dto.setIdAccount(candidature.getAccount().getId());
        dto.setNomeAzienda(candidature.getNomeAzienda());
        dto.setPosizioneLavorativa(candidature.getPosizioneLavorativa());
        dto.setJobOffert(candidature.getJobOffert());
        dto.setModalita(candidature.getModalita());
        dto.setCitta(cittaMapper.toDTO(candidature.getCitta()));
        dto.setStatoCandidatura(candidature.getStatoCandidatura());
        dto.setNote(candidature.getNote());
        dto.setDataCandidatura(candidature.getDataCandidatura());
        dto.setDataCreazione(candidature.getDataCreazione());
        return dto;
    }

    @Override
    public Candidature toEntity(CandidatureDTO candidatureDTO) {
        if (candidatureDTO == null) {
            return null;
        }
        Candidature entity = new Candidature();
        updateEntity(candidatureDTO, entity);
        return entity;
    }

    // id, account, citta e dataCreazione restano esclusi: li gestisce il service
    @Override
    public void updateEntity(CandidatureDTO candidatureDTO, Candidature candidature) {
        candidature.setNomeAzienda(candidatureDTO.getNomeAzienda());
        candidature.setPosizioneLavorativa(candidatureDTO.getPosizioneLavorativa());
        candidature.setJobOffert(candidatureDTO.getJobOffert());
        candidature.setModalita(candidatureDTO.getModalita());
        candidature.setStatoCandidatura(candidatureDTO.getStatoCandidatura());
        candidature.setNote(candidatureDTO.getNote());
        candidature.setDataCandidatura(candidatureDTO.getDataCandidatura());
    }
}
