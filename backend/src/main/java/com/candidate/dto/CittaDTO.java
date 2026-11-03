package com.candidate.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CittaDTO {
    private Long id;

    @NotBlank
    @Size(max = 255)
    private String nomeCitta;

    @NotBlank
    @Size(max = 255)
    private String provincia;

    @NotBlank
    @Size(max = 255)
    private String regione;

    @NotBlank
    @Size(max = 255)
    private String nazione;
}
