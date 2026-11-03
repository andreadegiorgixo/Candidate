package com.candidate.dto;

import java.time.LocalDate;

import com.candidate.entity.Modalita;
import com.candidate.entity.StatoCandidatura;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CandidatureDTO {
    private Long id;

    // valorizzato dal server in uscita; in ingresso viene ignorato (vale l'account del token)
    private Long idAccount;

    @NotBlank
    @Size(max = 255)
    private String nomeAzienda;

    @NotBlank
    @Size(max = 255)
    private String posizioneLavorativa;

    @NotBlank
    @Size(max = 20000)
    private String jobOffert;

    @NotNull
    private Modalita modalita;

    // in ingresso basta l'id di una citta' esistente
    @NotNull
    private CittaDTO citta;

    @NotNull
    private StatoCandidatura statoCandidatura;

    @NotNull
    private LocalDate dataCandidatura;

    @Size(max = 10000)
    private String note;

    private LocalDate dataCreazione;
}
