package com.candidate.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String risorsa, Long id) {
        super(risorsa + " non trovato con id " + id);
    }
}
