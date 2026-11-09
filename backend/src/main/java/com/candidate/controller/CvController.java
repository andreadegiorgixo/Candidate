package com.candidate.controller;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.candidate.dto.CvDTO;
import com.candidate.dto.CvFileDTO;
import com.candidate.service.CvService;

import lombok.RequiredArgsConstructor;

// i CV sono file (PDF, DOC, DOCX, max 5 MB) inviati come multipart/form-data
@RestController
@RequestMapping("/api/cv")
@RequiredArgsConstructor
public class CvController {

    private final CvService cvService;

    // GET /api/cv  (solo metadati, dalla versione piu' recente)
    @GetMapping
    public List<CvDTO> findAll(@AuthenticationPrincipal Jwt jwt) {
        return cvService.findAll(CurrentAccount.id(jwt));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CvDTO create(@RequestParam(required = false) String nome,
            @RequestParam(required = false) MultipartFile file, @AuthenticationPrincipal Jwt jwt) {
        return cvService.create(CurrentAccount.id(jwt), nome, file);
    }

    // rinomina; se c'e' anche il file, lo sostituisce
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CvDTO update(@PathVariable Long id, @RequestParam(required = false) String nome,
            @RequestParam(required = false) MultipartFile file, @AuthenticationPrincipal Jwt jwt) {
        return cvService.update(CurrentAccount.id(jwt), id, nome, file);
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> download(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        CvFileDTO cv = cvService.download(CurrentAccount.id(jwt), id);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(cv.contentType()))
            .contentLength(cv.contenuto().length)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(cv.nomeFile(), StandardCharsets.UTF_8).build().toString())
            .body(cv.contenuto());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        cvService.delete(CurrentAccount.id(jwt), id);
    }
}
