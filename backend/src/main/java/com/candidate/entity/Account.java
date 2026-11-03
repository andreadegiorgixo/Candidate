package com.candidate.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

@Entity (name = "ACCOUNT")
public class Account {
    
    @Id 
    @GeneratedValue (strategy = jakarta.persistence.GenerationType.IDENTITY)
    private Long id;
    
    @Column (name = "NOME", nullable = false)
    private String nome;
    
    @Column (name = "COGNOME", nullable = false)
    private String cognome;
    
    @Column (name = "EMAIL", nullable = false, unique = true)
    private String email;
    
    @Column (name = "PASSWORD", nullable = false)
    private String password;

    @Column (name = "DATA_CREAZIONE", nullable = false)
    private LocalDate dataCreazione;

    //--------------------- COSTRUTTORI ---------------------//
    
    public Account() {
    }
    
    public Account(String nome, String cognome, String email, String password) {
        this.nome = nome;
        this.cognome = cognome;
        this.email = email;
        this.password = password;
    }

    //--------------------- GETTER E SETTER ---------------------//

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getCognome() {
        return cognome;
    }

    public void setCognome(String cognome) {
        this.cognome = cognome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }   
}