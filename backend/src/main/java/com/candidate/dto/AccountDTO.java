package com.candidate.dto;

import java.time.LocalDate;

import lombok.Data;

@Data
public class AccountDTO {
    private Long id;
    private String nome;
    private String cognome;
    private String email;
    private String password;
    private LocalDate dataCreazione;
}
