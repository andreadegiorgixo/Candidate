package com.candidate.mapper.CandidatureMapper;

import com.candidate.dto.CandidatureDTO;
import com.candidate.entity.Candidature;

public interface CandidatureMapper {
    CandidatureDTO toDTO(Candidature candidature);
    Candidature toEntity(CandidatureDTO candidatureDTO);
    void updateEntity(CandidatureDTO candidatureDTO, Candidature candidature);
}
