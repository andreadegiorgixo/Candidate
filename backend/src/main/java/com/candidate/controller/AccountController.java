package com.candidate.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.candidate.dto.AccountDTO;
import com.candidate.service.AccountService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

// la creazione dell'account avviene da /api/auth/register; qui ognuno gestisce solo il proprio account
@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/me")
    public AccountDTO getMe(@AuthenticationPrincipal Jwt jwt) {
        return accountService.getById(CurrentAccount.id(jwt));
    }

    @GetMapping("/{id}")
    public AccountDTO getAccount(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        CurrentAccount.requireSelf(jwt, id);
        return accountService.getById(id);
    }

    @PutMapping("/{id}")
    public AccountDTO updateAccount(@PathVariable Long id, @Valid @RequestBody AccountDTO accountDTO,
            @AuthenticationPrincipal Jwt jwt) {
        CurrentAccount.requireSelf(jwt, id);
        return accountService.update(id, accountDTO);
    }

    @DeleteMapping("/delete/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        CurrentAccount.requireSelf(jwt, id);
        accountService.delete(id);
    }
}
