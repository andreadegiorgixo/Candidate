package com.candidate.dto;

// il file di un CV, pronto per il download
public record CvFileDTO(String nomeFile, String contentType, byte[] contenuto) {
}
