package com.candidate.exception;

public class CittaInUseException extends RuntimeException {

    public CittaInUseException(Long id) {
        super("Citta' con id " + id + " non eliminabile: e' usata da almeno una candidatura");
    }
}
