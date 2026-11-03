package com.candidate.exception;

public class EmailAlreadyUsedException extends RuntimeException {

    public EmailAlreadyUsedException(String email) {
        super("Email gia' registrata: " + email);
    }
}
