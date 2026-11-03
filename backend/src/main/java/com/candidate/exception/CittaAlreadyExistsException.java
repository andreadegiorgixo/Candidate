package com.candidate.exception;

public class CittaAlreadyExistsException extends RuntimeException {

    public CittaAlreadyExistsException(String nomeCitta, String provincia) {
        super("Citta' gia' presente: " + nomeCitta + " (" + provincia + ")");
    }
}
