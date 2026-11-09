package com.candidate.service;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.candidate.dto.CvDTO;
import com.candidate.dto.CvFileDTO;
import com.candidate.entity.Cv;
import com.candidate.exception.BadRequestException;
import com.candidate.exception.FileTroppoGrandeException;
import com.candidate.exception.ResourceNotFoundException;
import com.candidate.mapper.CvMapper.CvMapper;
import com.candidate.repository.RepositoryAccount;
import com.candidate.repository.RepositoryCv;

import lombok.RequiredArgsConstructor;

/**
 * Ogni operazione e' limitata ai CV dell'account indicato:
 * il CV di un altro account risulta "non trovato".
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CvService {

    // da tenere allineato a spring.servlet.multipart.max-file-size
    public static final long MAX_BYTES = 5L * 1024 * 1024;

    private static final int MAX_LUNGHEZZA = 255;

    // estensioni ammesse e relativo content type (devono corrispondere entrambi)
    private static final Map<String, String> TIPI_AMMESSI = Map.of(
        "pdf", "application/pdf",
        "doc", "application/msword",
        "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    private static final String MSG_TIPO = "Formato non ammesso: carica un file PDF, DOC o DOCX";

    private final RepositoryCv repositoryCv;
    private final RepositoryAccount repositoryAccount;
    private final CvMapper mapper;

    // dalla versione piu' recente; non legge il contenuto dei file
    @Transactional(readOnly = true)
    public List<CvDTO> findAll (Long idAccount) {
        return repositoryCv.findByAccountIdOrderByDataCaricamentoDescIdDesc(idAccount).stream()
            .map(mapper::toDTO).toList();
    }

    public CvDTO create (Long idAccount, String nome, MultipartFile file) {

        String nomePulito = validaNome(nome);
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("file", "Scegli il file del CV");
        }
        Cv entity = new Cv();
        entity.setAccount(repositoryAccount.findById(idAccount)
            .orElseThrow(() -> new ResourceNotFoundException("Account", idAccount)));
        entity.setNome(nomePulito);
        applicaFile(entity, file);
        return mapper.toDTO(repositoryCv.save(entity));
    }

    // il file e' facoltativo: se manca cambia solo il nome
    public CvDTO update (Long idAccount, Long id, String nome, MultipartFile file) {

        String nomePulito = validaNome(nome);
        Cv entity = findCv(idAccount, id);
        entity.setNome(nomePulito);
        if (file != null && !file.isEmpty()) {
            applicaFile(entity, file);
        }
        return mapper.toDTO(repositoryCv.save(entity));
    }

    public void delete (Long idAccount, Long id) {
        repositoryCv.delete(findCv(idAccount, id));
    }

    @Transactional(readOnly = true)
    public CvFileDTO download (Long idAccount, Long id) {
        Cv entity = findCv(idAccount, id);
        return new CvFileDTO(entity.getNomeFile(), entity.getContentType(), entity.getContenuto());
    }

    private void applicaFile (Cv entity, MultipartFile file) {

        String nomeFile = pulisciNomeFile(file.getOriginalFilename());
        String estensione = estensione(nomeFile);
        String contentTypeAtteso = TIPI_AMMESSI.get(estensione);
        if (contentTypeAtteso == null || !contentTypeAtteso.equals(contentTypeDi(file))) {
            throw new BadRequestException("file", MSG_TIPO);
        }
        if (file.getSize() > MAX_BYTES) {
            throw new FileTroppoGrandeException("Il file supera il limite di 5 MB");
        }
        try {
            entity.setContenuto(file.getBytes());
        } catch (IOException e) {
            throw new BadRequestException("file", "Impossibile leggere il file caricato");
        }
        entity.setNomeFile(nomeFile);
        entity.setContentType(contentTypeAtteso);
        entity.setDimensione(file.getSize());
        entity.setDataCaricamento(Instant.now());
    }

    private String validaNome (String nome) {
        if (nome == null || nome.isBlank()) {
            throw new BadRequestException("nome", "Il nome della versione e' obbligatorio");
        }
        String pulito = nome.trim();
        if (pulito.length() > MAX_LUNGHEZZA) {
            throw new BadRequestException("nome", "Il nome non puo' superare " + MAX_LUNGHEZZA + " caratteri");
        }
        return pulito;
    }

    // toglie l'eventuale percorso e i caratteri di controllo che il client puo' avere inviato
    private String pulisciNomeFile (String originale) {
        if (originale == null || originale.isBlank()) {
            throw new BadRequestException("file", MSG_TIPO);
        }
        String nome = originale.substring(Math.max(originale.lastIndexOf('/'), originale.lastIndexOf('\\')) + 1)
            .replaceAll("\\p{Cntrl}", "").trim();
        if (nome.length() > MAX_LUNGHEZZA) {
            String ext = estensione(nome);
            nome = nome.substring(0, MAX_LUNGHEZZA - ext.length() - 1) + "." + ext;
        }
        return nome;
    }

    private String estensione (String nomeFile) {
        int punto = nomeFile.lastIndexOf('.');
        return punto < 0 ? "" : nomeFile.substring(punto + 1).toLowerCase(Locale.ROOT);
    }

    // content type senza parametri (es. "; charset=...")
    private String contentTypeDi (MultipartFile file) {
        String tipo = file.getContentType();
        if (tipo == null) {
            return "";
        }
        int fine = tipo.indexOf(';');
        return (fine < 0 ? tipo : tipo.substring(0, fine)).trim().toLowerCase(Locale.ROOT);
    }

    private Cv findCv (Long idAccount, Long id) {
        return repositoryCv.findByIdAndAccountId(id, idAccount)
            .orElseThrow(() -> new ResourceNotFoundException("Cv", id));
    }
}
