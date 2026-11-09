package com.candidate.entity;

import java.time.Instant;

// i metadati di un CV, senza il contenuto: e' la sola parte letta per l'elenco
public interface CvInfo {

    Long getId();

    String getNome();

    String getNomeFile();

    String getContentType();

    long getDimensione();

    Instant getDataCaricamento();
}
