package com.candidate.mapper.CandidatureMapper;

import com.candidate.dto.CandidatureDTO;
import com.candidate.entity.Candidature;

public class CandidatureMapperImpl implements CandidatureMapper {
    
    @Override
    public CandidatureDTO toDTO(Candidature candidature) {
        if (candidature == null) {
            return null;
        }
        CandidatureDTO dto = new CandidatureDTO();
        dto.setId(candidature.getId());
        dto.setAccount(candidature.getAccount());
        dto.setNomeAzienda(candidature.getNomeAzienda());
        dto.setPosizioneLavorativa(candidature.getPosizioneLavorativa());
        dto.setJobOffert(candidature.getJobOffert());
        dto.setModalita(candidature.getModalita());
        dto.setCitta(candidature.getCitta());
        dto.setStatoCandidatura(candidature.getStatoCandidatura());
        dto.setNote(candidature.getNote());
        dto.setDataCandidatura(candidature.getDataCandidatura());
        return dto;
    }

    @Override
    public Candidature toEntity(CandidatureDTO candidatureDTO) {
        if (candidatureDTO == null) {
            return null;
        }
        Candidature entity = new Candidature();
        entity.setId(candidatureDTO.getId());
        entity.setAccount(candidatureDTO.getAccount());
        entity.setNomeAzienda(candidatureDTO.getNomeAzienda());
        entity.setPosizioneLavorativa(candidatureDTO.getPosizioneLavorativa());
        entity.setJobOffert(candidatureDTO.getJobOffert());
        entity.setModalita(candidatureDTO.getModalita());
        entity.setCitta(candidatureDTO.getCitta());
        entity.setStatoCandidatura(candidatureDTO.getStatoCandidatura());
        entity.setNote(candidatureDTO.getNote());
        entity.setDataCandidatura(candidatureDTO.getDataCandidatura());
        return entity;
    }
}