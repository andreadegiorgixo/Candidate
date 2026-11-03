package com.candidate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import com.candidate.dto.AccountDTO;
import com.candidate.dto.CandidatureDTO;
import com.candidate.dto.CittaDTO;
import com.candidate.entity.Citta;
import com.candidate.entity.Modalita;
import com.candidate.entity.StatoCandidatura;
import com.candidate.exception.BadRequestException;
import com.candidate.exception.ResourceNotFoundException;
import com.candidate.repository.RepositoryAccount;
import com.candidate.repository.RepositoryCandidature;
import com.candidate.repository.RepositoryCitta;
import com.candidate.service.AccountService;
import com.candidate.service.CandidatureService;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class CandidatureServiceTests {

	@Autowired
	private CandidatureService service;

	@Autowired
	private AccountService accountService;

	@Autowired
	private RepositoryCandidature repositoryCandidature;

	@Autowired
	private RepositoryAccount repositoryAccount;

	@Autowired
	private RepositoryCitta repositoryCitta;

	private Long idAccount;

	private Citta milano;

	@BeforeEach
	void prepareDatabase() {
		repositoryCandidature.deleteAll();
		repositoryAccount.deleteAll();
		repositoryCitta.deleteAll();

		AccountDTO account = new AccountDTO();
		account.setNome("Mario");
		account.setCognome("Rossi");
		account.setEmail("a@test.it");
		account.setPassword("segreta");
		idAccount = accountService.create(account).getId();
		milano = repositoryCitta.save(new Citta(null, "Milano", "MI", "Lombardia", "Italia"));
	}

	private CandidatureDTO dto(String azienda, Long idCitta, StatoCandidatura stato) {
		CittaDTO citta = new CittaDTO();
		citta.setId(idCitta);

		CandidatureDTO dto = new CandidatureDTO();
		dto.setIdAccount(idAccount);
		dto.setNomeAzienda(azienda);
		dto.setPosizioneLavorativa("Backend Developer");
		dto.setJobOffert("x".repeat(1000));
		dto.setModalita(Modalita.IBRIDO);
		dto.setCitta(citta);
		dto.setStatoCandidatura(stato);
		dto.setDataCandidatura(LocalDate.of(2026, 11, 1));
		return dto;
	}

	@Test
	void createRestituisceRelazioniEData() {
		CandidatureDTO creata = service.create(idAccount, dto("Acme", milano.getId(), StatoCandidatura.IN_FASE_DI_ATTESA));

		assertThat(creata.getId()).isNotNull();
		assertThat(creata.getIdAccount()).isEqualTo(idAccount);
		assertThat(creata.getCitta().getNomeCitta()).isEqualTo("Milano");
		assertThat(creata.getDataCreazione()).isNotNull();
	}

	@Test
	void unAccountPuoAvereDiverseCandidatureNellaStessaCitta() {
		service.create(idAccount, dto("Acme", milano.getId(), StatoCandidatura.IN_FASE_DI_ATTESA));
		service.create(idAccount, dto("Globex", milano.getId(), StatoCandidatura.ASSUNZIONE_COMPLETATA));

		assertThat(service.findByCitta(idAccount, "Milano")).hasSize(2);
		assertThat(service.findByCitta(idAccount, "Roma")).isEmpty();
	}

	@Test
	void leRicercheRestituisconoTuttiIRisultati() {
		service.create(idAccount, dto("Acme", milano.getId(), StatoCandidatura.IN_FASE_DI_ATTESA));
		service.create(idAccount, dto("Acme", milano.getId(), StatoCandidatura.ASSUNZIONE_COMPLETATA));

		assertThat(service.findByAzienda(idAccount, "Acme")).hasSize(2);
		assertThat(service.findByStatoCandidatura(idAccount, StatoCandidatura.ASSUNZIONE_COMPLETATA)).hasSize(1);
		assertThat(service.findByStatoCandidatura(idAccount, StatoCandidatura.RIFIUTATO_DA_RECRUITER)).isEmpty();
	}

	@Test
	void updateMantieneAccountEDataCreazione() {
		CandidatureDTO creata = service.create(idAccount, dto("Acme", milano.getId(), StatoCandidatura.IN_FASE_DI_ATTESA));
		Citta roma = repositoryCitta.save(new Citta(null, "Roma", "RM", "Lazio", "Italia"));
		CandidatureDTO modifica = dto("Acme", roma.getId(), StatoCandidatura.FASE_DI_COLLOQUIO_TECNICO_1);
		modifica.setIdAccount(999L);

		CandidatureDTO aggiornata = service.update(idAccount, creata.getId(), modifica);

		assertThat(aggiornata.getIdAccount()).isEqualTo(idAccount);
		assertThat(aggiornata.getDataCreazione()).isEqualTo(creata.getDataCreazione());
		assertThat(aggiornata.getStatoCandidatura()).isEqualTo(StatoCandidatura.FASE_DI_COLLOQUIO_TECNICO_1);
		assertThat(service.getById(idAccount, creata.getId()).getCitta().getNomeCitta()).isEqualTo("Roma");
	}

	@Test
	void riferimentiInesistentiDannoNotFound() {
		assertThatThrownBy(() -> service.getById(idAccount, 999L)).isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> service.delete(idAccount, 999L)).isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> service.create(idAccount, dto("Acme", 999L, StatoCandidatura.IN_FASE_DI_ATTESA)))
				.isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	void unAltroAccountNonVedeNeModificaLeMieCandidature() {
		CandidatureDTO creata = service.create(idAccount, dto("Acme", milano.getId(), StatoCandidatura.IN_FASE_DI_ATTESA));
		AccountDTO altro = new AccountDTO();
		altro.setNome("Luigi");
		altro.setCognome("Verdi");
		altro.setEmail("b@test.it");
		altro.setPassword("segretissima");
		Long idAltro = accountService.create(altro).getId();

		assertThat(service.findAll(idAltro)).isEmpty();
		assertThat(service.findByCitta(idAltro, "Milano")).isEmpty();
		assertThatThrownBy(() -> service.getById(idAltro, creata.getId())).isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> service.delete(idAltro, creata.getId())).isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> service.update(idAltro, creata.getId(),
				dto("Hack", milano.getId(), StatoCandidatura.ASSUNZIONE_COMPLETATA)))
				.isInstanceOf(ResourceNotFoundException.class);
		assertThat(service.getById(idAccount, creata.getId()).getNomeAzienda()).isEqualTo("Acme");
	}

	@Test
	void createUsaSempreLAccountIndicatoENonQuelloDelDto() {
		CandidatureDTO richiesta = dto("Acme", milano.getId(), StatoCandidatura.IN_FASE_DI_ATTESA);
		richiesta.setIdAccount(999L);

		assertThat(service.create(idAccount, richiesta).getIdAccount()).isEqualTo(idAccount);
	}

	@Test
	void createSenzaCittaDaBadRequest() {
		CandidatureDTO richiesta = dto("Acme", milano.getId(), StatoCandidatura.IN_FASE_DI_ATTESA);
		richiesta.setCitta(null);

		assertThatThrownBy(() -> service.create(idAccount, richiesta)).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> service.create(idAccount, dto("Acme", null, StatoCandidatura.IN_FASE_DI_ATTESA)))
				.isInstanceOf(BadRequestException.class);
	}

	@Test
	void updateStatoCambiaSoloLoStato() {
		CandidatureDTO creata = service.create(idAccount, dto("Acme", milano.getId(), StatoCandidatura.IN_FASE_DI_ATTESA));

		CandidatureDTO aggiornata = service.updateStato(idAccount, creata.getId(), StatoCandidatura.RIFIUTATO_DA_RECRUITER);

		assertThat(aggiornata.getStatoCandidatura()).isEqualTo(StatoCandidatura.RIFIUTATO_DA_RECRUITER);
		assertThat(aggiornata.getNomeAzienda()).isEqualTo("Acme");
	}

	@Test
	void laRicercaPerAziendaNonDistingueMaiuscoleEUsaIlContenuto() {
		service.create(idAccount, dto("Acme Italia", milano.getId(), StatoCandidatura.IN_FASE_DI_ATTESA));

		assertThat(service.findByAzienda(idAccount, "acme")).hasSize(1);
		assertThat(service.findByCitta(idAccount, "MILANO")).hasSize(1);
	}

	@Test
	void cancellareAccountCancellaLeSueCandidature() {
		CandidatureDTO creata = service.create(idAccount, dto("Acme", milano.getId(), StatoCandidatura.IN_FASE_DI_ATTESA));

		accountService.delete(idAccount);

		assertThat(repositoryCandidature.existsById(creata.getId())).isFalse();
		assertThat(repositoryCitta.existsById(milano.getId())).isTrue();
	}

}
