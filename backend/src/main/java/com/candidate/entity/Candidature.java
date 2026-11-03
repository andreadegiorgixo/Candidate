package com.candidate.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;

@Entity (name = "CANDIDATURE")
public class Candidature {
    
    @Id
    @GeneratedValue (strategy = jakarta.persistence.GenerationType.IDENTITY)
    private Long id;

    @ManyToOne (fetch = FetchType.LAZY, optional = false)
    @JoinColumn (name = "ID_ACCOUNT", nullable = false)
    private Account account;

    @Column (name = "NOME_AZIENDA", nullable = false)
    private String nomeAzienda;

    @Column (name = "POSIZIONE_LAVORATIVA", nullable = false)
    private String posizioneLavorativa;

    @Column (name = "JOB_OFFERT", nullable = false, columnDefinition = "TEXT")
    private String jobOffert;

    @Enumerated (EnumType.STRING)
    @Column (name = "MODALITA", nullable = false)
    private Modalita modalita;

    @ManyToOne (fetch = FetchType.LAZY, optional = false)
    @JoinColumn (name = "ID_CITTA", nullable = false)
    private Citta citta;

    @Enumerated (EnumType.STRING)
    @Column (name = "STATO_CANDIDATURA", nullable = false)
    private StatoCandidatura statoCandidatura;
    
    @Column (name = "DATA_CANDIDATURA", nullable = false)
    private LocalDate dataCandidatura;

    @Column (name = "NOTE", nullable = true, columnDefinition = "TEXT")
    private String note;

    @Column (name = "DATA_CREAZIONE", nullable = false)
    private LocalDate dataCreazione;


    //--------------------- COSTRUTTORI ---------------------//

    public Candidature() {
    }

    public Candidature(Long id, Account account, String nomeAzienda, String posizioneLavorativa, String jobOffert,
            Modalita modalita, Citta citta, StatoCandidatura statoCandidatura, LocalDate dataCandidatura, String note, LocalDate dataCreazione) {
        this.id = id;
        this.account = account;
        this.nomeAzienda = nomeAzienda;
        this.posizioneLavorativa = posizioneLavorativa;
        this.jobOffert = jobOffert;
        this.modalita = modalita;
        this.citta = citta;
        this.statoCandidatura = statoCandidatura;
        this.dataCandidatura = dataCandidatura;
        this.note = note;
        this.dataCreazione = dataCreazione;
    }

    //--------------------- CALLBACK JPA ---------------------//

    @PrePersist
    private void onCreate() {
        if (dataCreazione == null) {
            dataCreazione = LocalDate.now();
        }
    }

    //--------------------- GETTER E SETTER ---------------------//

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Account getAccount() {
        return account;
    }

    public void setAccount(Account account) {
        this.account = account;
    }

    public String getNomeAzienda() {
        return nomeAzienda;
    }

    public void setNomeAzienda(String nomeAzienda) {
        this.nomeAzienda = nomeAzienda;
    }

    public String getPosizioneLavorativa() {
        return posizioneLavorativa;
    }

    public void setPosizioneLavorativa(String posizioneLavorativa) {
        this.posizioneLavorativa = posizioneLavorativa;
    }

    public String getJobOffert() {
        return jobOffert;
    }

    public void setJobOffert(String jobOffert) {
        this.jobOffert = jobOffert;
    }

    public Modalita getModalita() {
        return modalita;
    }

    public void setModalita(Modalita modalita) {
        this.modalita = modalita;
    }

    public Citta getCitta() {
        return citta;
    }

    public void setCitta(Citta citta) {
        this.citta = citta;
    }

    public StatoCandidatura getStatoCandidatura() {
        return statoCandidatura;
    }

    public void setStatoCandidatura(StatoCandidatura statoCandidatura) {
        this.statoCandidatura = statoCandidatura;
    }

    public LocalDate getDataCandidatura() {
        return dataCandidatura;
    }

    public void setDataCandidatura(LocalDate dataCandidatura) {
        this.dataCandidatura = dataCandidatura;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDate getDataCreazione() {
        return dataCreazione;
    }

    public void setDataCreazione(LocalDate dataCreazione) {
        this.dataCreazione = dataCreazione;
    }
}