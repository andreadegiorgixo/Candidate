package com.candidate.dto;

import lombok.Data;

@Data
public class CittaDTO {
    private Long id;
    private String nomeCitta;
    private String provincia;
    private String regione;
    private String nazione;
}