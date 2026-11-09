package com.candidate.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;

@Entity (name = "CV")
public class Cv implements CvInfo {

    @Id
    @GeneratedValue (strategy = jakarta.persistence.GenerationType.IDENTITY)
    private Long id;

    @ManyToOne (fetch = FetchType.LAZY, optional = false)
    @JoinColumn (name = "ID_ACCOUNT", nullable = false)
    private Account account;

    @Column (name = "NOME", nullable = false)
    private String nome;

    @Column (name = "NOME_FILE", nullable = false)
    private String nomeFile;

    @Column (name = "CONTENT_TYPE", nullable = false)
    private String contentType;

    @Column (name = "DIMENSIONE", nullable = false)
    private long dimensione;

    @Column (name = "CONTENUTO", nullable = false)
    private byte[] contenuto;

    @Column (name = "DATA_CARICAMENTO", nullable = false)
    private Instant dataCaricamento;

    //--------------------- COSTRUTTORI ---------------------//

    public Cv() {
    }

    //--------------------- CALLBACK JPA ---------------------//

    @PrePersist
    private void onCreate() {
        if (dataCaricamento == null) {
            dataCaricamento = Instant.now();
        }
    }

    //--------------------- GETTER E SETTER ---------------------//

    @Override
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

    @Override
    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    @Override
    public String getNomeFile() {
        return nomeFile;
    }

    public void setNomeFile(String nomeFile) {
        this.nomeFile = nomeFile;
    }

    @Override
    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    @Override
    public long getDimensione() {
        return dimensione;
    }

    public void setDimensione(long dimensione) {
        this.dimensione = dimensione;
    }

    public byte[] getContenuto() {
        return contenuto;
    }

    public void setContenuto(byte[] contenuto) {
        this.contenuto = contenuto;
    }

    @Override
    public Instant getDataCaricamento() {
        return dataCaricamento;
    }

    public void setDataCaricamento(Instant dataCaricamento) {
        this.dataCaricamento = dataCaricamento;
    }
}
