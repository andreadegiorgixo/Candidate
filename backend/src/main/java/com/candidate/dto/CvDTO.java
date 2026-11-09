package com.candidate.dto;

import java.time.Instant;

// metadati di un CV: il file si scarica da GET /api/cv/{id}/file
public record CvDTO(Long id, String nome, String nomeFile, String contentType, long dimensione,
        Instant dataCaricamento) {
}
