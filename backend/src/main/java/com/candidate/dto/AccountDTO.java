package com.candidate.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;

@Data
public class AccountDTO {
    private Long id;

    @NotBlank
    @Size(max = 255)
    private String nome;

    @NotBlank
    @Size(max = 255)
    private String cognome;

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    // solo in ingresso: non viene mai serializzata verso il client.
    // Obbligatoria in registrazione (controllo nel service), opzionale in modifica.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @ToString.Exclude
    @Size(min = 8, max = 72)
    private String password;

    private LocalDate dataCreazione;
}
