package com.candidate.mapper.CittaMapper;

import com.candidate.dto.CittaDTO;
import com.candidate.entity.Citta;

public class CittaMapperImpl implements CittaMapper {

    @Override
    public CittaDTO toDTO(Citta citta) {
        if (citta == null) {
            return null;
        }

        CittaDTO dto = new CittaDTO();
        dto.setId(citta.getId());
        dto.setNomeCitta(citta.getNomeCitta());
        dto.setProvincia(citta.getProvincia());
        dto.setRegione(citta.getRegione());
        dto.setNazione(citta.getNazione());

        return dto;
    }

    @Override
    public Citta toEntity(CittaDTO cittaDTO) {
        if (cittaDTO == null) {
            return null;
        }

        Citta entity = new Citta();
        entity.setId(cittaDTO.getId());
        entity.setNomeCitta(cittaDTO.getNomeCitta());
        entity.setProvincia(cittaDTO.getProvincia());
        entity.setRegione(cittaDTO.getRegione());
        entity.setNazione(cittaDTO.getNazione());

        return entity;
    }
}
