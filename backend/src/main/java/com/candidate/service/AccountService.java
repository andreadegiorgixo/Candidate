package com.candidate.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.candidate.dto.AccountDTO;
import com.candidate.entity.Account;
import com.candidate.exception.BadRequestException;
import com.candidate.exception.EmailAlreadyUsedException;
import com.candidate.exception.ResourceNotFoundException;
import com.candidate.mapper.AccountMapper.AccountMapper;
import com.candidate.repository.RepositoryAccount;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class AccountService {

    // BCrypt considera solo i primi 72 byte della password
    private static final int MAX_PASSWORD_BYTES = 72;

    private final RepositoryAccount repositoryAccount;
    private final AccountMapper mapper;
    private final PasswordEncoder passwordEncoder;

    public AccountDTO create (AccountDTO dto) {

        if (dto.getPassword() == null || dto.getPassword().isBlank()) {
            throw new BadRequestException("La password e' obbligatoria");
        }
        dto.setEmail(normalizeEmail(dto.getEmail()));
        if (repositoryAccount.existsByEmail(dto.getEmail())) {
            throw new EmailAlreadyUsedException(dto.getEmail());
        }

        Account entity = mapper.toEntity(dto);
        entity.setPassword(encode(dto.getPassword()));
        return mapper.toDTO(repositoryAccount.save(entity));
    }

    // la password cambia solo se presente nel dto
    public AccountDTO update (Long id, AccountDTO dto) {

        Account entity = findAccount(id);

        dto.setEmail(normalizeEmail(dto.getEmail()));
        if (repositoryAccount.existsByEmailAndIdNot(dto.getEmail(), id)) {
            throw new EmailAlreadyUsedException(dto.getEmail());
        }

        mapper.updateEntity(dto, entity);
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            entity.setPassword(encode(dto.getPassword()));
        }
        return mapper.toDTO(repositoryAccount.save(entity));
    }

    // le candidature dell'account vengono cancellate dal database (ON DELETE CASCADE)
    public void delete (Long id) {

        if (!repositoryAccount.existsById(id)) {
            throw new ResourceNotFoundException("Account", id);
        }
        repositoryAccount.deleteById(id);
    }

    @Transactional(readOnly = true)
    public AccountDTO getById (Long id) {
        return mapper.toDTO(findAccount(id));
    }

    // le email sono confrontate senza distinguere maiuscole/minuscole
    public static String normalizeEmail (String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private String encode (String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new BadRequestException("La password non puo' superare " + MAX_PASSWORD_BYTES + " byte");
        }
        return passwordEncoder.encode(password);
    }

    private Account findAccount (Long id) {
        return repositoryAccount.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Account", id));
    }
}
