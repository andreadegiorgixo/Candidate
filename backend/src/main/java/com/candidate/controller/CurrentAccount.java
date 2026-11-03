package com.candidate.controller;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;

// l'id dell'account autenticato e' il subject del token emesso al login
final class CurrentAccount {

    private CurrentAccount() {
    }

    static Long id(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }

    // un account puo' agire solo su se stesso
    static void requireSelf(Jwt jwt, Long idRichiesto) {
        if (!id(jwt).equals(idRichiesto)) {
            throw new AccessDeniedException("Accesso negato");
        }
    }
}
