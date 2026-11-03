package com.candidate.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.candidate.entity.Account;

public interface RepositoryAccount extends JpaRepository<Account, Long> {
}