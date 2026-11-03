package com.candidate.mapper.CittaMapper;

import org.springframework.stereotype.Component;

import com.candidate.dto.CittaDTO;
import com.candidate.entity.Citta;

@Component
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
        updateEntity(cittaDTO, entity);

        return entity;
    }

    // l'id resta escluso: lo gestisce il service
    @Override
    public void updateEntity(CittaDTO cittaDTO, Citta citta) {
        citta.setNomeCitta(cittaDTO.getNomeCitta());
        citta.setProvincia(cittaDTO.getProvincia());
        citta.setRegione(cittaDTO.getRegione());
        citta.setNazione(cittaDTO.getNazione());
    }
}
