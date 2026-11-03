package com.candidate.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.candidate.dto.CandidatureDTO;
import com.candidate.dto.StatoUpdateDTO;
import com.candidate.entity.StatoCandidatura;
import com.candidate.service.CandidatureService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;

// tutte le operazioni riguardano solo le candidature dell'account autenticato
@RestController
@RequestMapping("/api/candidatura")
@RequiredArgsConstructor
public class CandidaturaController {

    private final CandidatureService candidaturaService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CandidatureDTO create(@Valid @RequestBody CandidatureDTO dto, @AuthenticationPrincipal Jwt jwt) {
        return candidaturaService.create(CurrentAccount.id(jwt), dto);
    }

    @PutMapping("/{id}")
    public CandidatureDTO update(@PathVariable Long id, @Valid @RequestBody CandidatureDTO dto,
            @AuthenticationPrincipal Jwt jwt) {
        return candidaturaService.update(CurrentAccount.id(jwt), id, dto);
    }

    // cambia solo lo stato (es. dopo un colloquio)
    @PatchMapping("/{id}/stato")
    public CandidatureDTO updateStato(@PathVariable Long id, @Valid @RequestBody StatoUpdateDTO body,
            @AuthenticationPrincipal Jwt jwt) {
        return candidaturaService.updateStato(CurrentAccount.id(jwt), id, body.statoCandidatura());
    }

    @DeleteMapping("/delete/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        candidaturaService.delete(CurrentAccount.id(jwt), id);
    }

    @GetMapping("/{id}")
    public CandidatureDTO getById(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return candidaturaService.getById(CurrentAccount.id(jwt), id);
    }

    // GET /api/candidatura  (dalla piu' recente)
    @GetMapping
    public List<CandidatureDTO> findAll(@AuthenticationPrincipal Jwt jwt) {
        return candidaturaService.findAll(CurrentAccount.id(jwt));
    }

    // GET /api/candidatura/citta?nomeCitta=Milano
    @GetMapping("/citta")
    public List<CandidatureDTO> findByCitta(@RequestParam @NotBlank String nomeCitta,
            @AuthenticationPrincipal Jwt jwt) {
        return candidaturaService.findByCitta(CurrentAccount.id(jwt), nomeCitta);
    }

    // GET /api/candidatura/stato?statoCandidatura=IN_FASE_DI_ATTESA
    @GetMapping("/stato")
    public List<CandidatureDTO> findByStatoCandidatura(@RequestParam StatoCandidatura statoCandidatura,
            @AuthenticationPrincipal Jwt jwt) {
        return candidaturaService.findByStatoCandidatura(CurrentAccount.id(jwt), statoCandidatura);
    }

    // GET /api/candidatura/azienda?nomeAzienda=Acme
    @GetMapping("/azienda")
    public List<CandidatureDTO> findByAzienda(@RequestParam @NotBlank String nomeAzienda,
            @AuthenticationPrincipal Jwt jwt) {
        return candidaturaService.findByAzienda(CurrentAccount.id(jwt), nomeAzienda);
    }

}
