package com.candidate.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.candidate.entity.Citta;

public interface RepositoryCitta extends JpaRepository<Citta, Long> {
}