package com.candidate.exception;

public class BadRequestException extends RuntimeException {

    // campo a cui riferire l'errore (chiave di "errors" nella risposta), se c'e'
    private final String campo;

    public BadRequestException(String message) {
        this(null, message);
    }

    public BadRequestException(String campo, String message) {
        super(message);
        this.campo = campo;
    }

    public String getCampo() {
        return campo;
    }
}
