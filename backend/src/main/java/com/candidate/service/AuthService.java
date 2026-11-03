package com.candidate.service;

import java.time.Instant;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.candidate.config.CandidateProperties;
import com.candidate.dto.AccountDTO;
import com.candidate.dto.AuthResponseDTO;
import com.candidate.dto.LoginRequestDTO;
import com.candidate.entity.Account;
import com.candidate.exception.InvalidCredentialsException;
import com.candidate.mapper.AccountMapper.AccountMapper;
import com.candidate.repository.RepositoryAccount;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String TOKEN_TYPE = "Bearer";
    private static final String ISSUER = "candidate";

    private final RepositoryAccount repositoryAccount;
    private final AccountService accountService;
    private final AccountMapper accountMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final CandidateProperties properties;

    // hash fittizio: con email sconosciuta si confronta comunque una password,
    // cosi' i tempi di risposta non rivelano se l'email esiste
    private String dummyHash;

    @PostConstruct
    void init () {
        dummyHash = passwordEncoder.encode("password-fittizia");
    }

    @Transactional
    public AuthResponseDTO register (AccountDTO dto) {
        AccountDTO creato = accountService.create(dto);
        return issueToken(creato.getId(), creato);
    }

    @Transactional(readOnly = true)
    public AuthResponseDTO login (LoginRequestDTO request) {

        Account account = repositoryAccount.findByEmail(AccountService.normalizeEmail(request.email())).orElse(null);
        boolean valid = passwordEncoder.matches(request.password(), account != null ? account.getPassword() : dummyHash);
        if (account == null || !valid) {
            throw new InvalidCredentialsException();
        }
        return issueToken(account.getId(), accountMapper.toDTO(account));
    }

    private AuthResponseDTO issueToken (Long idAccount, AccountDTO dto) {

        Instant now = Instant.now();
        Instant expiresAt = now.plus(properties.security().jwt().expiration());
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer(ISSUER)
            .subject(String.valueOf(idAccount))
            .issuedAt(now)
            .expiresAt(expiresAt)
            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new AuthResponseDTO(token, TOKEN_TYPE, expiresAt, dto);
    }
}
