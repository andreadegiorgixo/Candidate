package com.candidate.mapper.CittaMapper;

import com.candidate.dto.CittaDTO;
import com.candidate.entity.Citta;

public interface CittaMapper {
    CittaDTO toDTO(Citta citta);
    Citta toEntity(CittaDTO cittaDTO);
}
