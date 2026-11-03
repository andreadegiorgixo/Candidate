package com.candidate.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.candidate.entity.Account;

public interface RepositoryAccount extends JpaRepository<Account, Long> {

    public Optional<Account> findByEmail(String email);
    public boolean existsByEmail(String email);
    public boolean existsByEmailAndIdNot(String email, Long id);
}
