package com.candidate.dto;

import java.time.LocalDate;

import com.candidate.entity.Account;
import com.candidate.entity.Citta;
import com.candidate.entity.Modalita;
import com.candidate.entity.StatoCandidatura;

import lombok.Data;

@Data
public class CandidatureDTO {
    private Long id;
    private Account account;
    private String nomeAzienda;
    private String posizioneLavorativa;
    private String jobOffert;
    private Modalita modalita;
    private Citta citta;
    private StatoCandidatura statoCandidatura;
    private LocalDate dataCandidatura;
    private String note;
    private LocalDate dataCreazione;
}