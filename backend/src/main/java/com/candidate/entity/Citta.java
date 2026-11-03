package com.candidate.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

@Entity (name = "CITTA")
public class Citta {
    
    @Id
    @GeneratedValue (strategy = jakarta.persistence.GenerationType.IDENTITY)
    private Long id;

    @Column (name = "NOME_CITTA", nullable = false)
    private String nomeCitta;
    
    @Column (name = "PROVINCIA", nullable = false)
    private String provincia;

    @Column (name = "REGIONE", nullable = false)
    private String regione;

    @Column (name = "NAZIONE", nullable = false)
    private String nazione;

    //--------------------- COSTRUTTORI ---------------------//

    public Citta() {
    }

    public Citta(Long id, String nomeCitta, String provincia, String regione, String nazione) {
        this.id = id;
        this.nomeCitta = nomeCitta;
        this.provincia = provincia;
        this.regione = regione;
        this.nazione = nazione;
    }

    //--------------------- GETTER E SETTER ---------------------//

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNomeCitta() {
        return nomeCitta;
    }

    public void setNomeCitta(String nomeCitta) {
        this.nomeCitta = nomeCitta;
    }

    public String getProvincia() {
        return provincia;
    }

    public void setProvincia(String provincia) {
        this.provincia = provincia;
    }

    public String getRegione() {
        return regione;
    }

    public void setRegione(String regione) {
        this.regione = regione;
    }

    public String getNazione() {
        return nazione;
    }

    public void setNazione(String nazione) {
        this.nazione = nazione;
    }

    
    
}
