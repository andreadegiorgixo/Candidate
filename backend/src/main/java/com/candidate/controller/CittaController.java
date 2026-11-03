package com.candidate.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.candidate.dto.CittaDTO;
import com.candidate.service.CittaService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/citta")
@RequiredArgsConstructor
public class CittaController {

    private final CittaService cittaService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CittaDTO create(@Valid @RequestBody CittaDTO dto) {
        return cittaService.create(dto);
    }

    @PutMapping("/{id}")
    public CittaDTO update(@PathVariable Long id, @Valid @RequestBody CittaDTO dto) {
        return cittaService.update(id, dto);
    }

    @DeleteMapping("/delete/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        cittaService.delete(id);
    }

    @GetMapping("/{id}")
    public CittaDTO getById(@PathVariable Long id) {
        return cittaService.getById(id);
    }

    // GET /api/citta  oppure  GET /api/citta?nome=mil (ricerca per autocompletamento)
    @GetMapping
    public List<CittaDTO> findAll(@RequestParam(required = false) String nome) {
        return cittaService.findAll(nome);
    }

}
