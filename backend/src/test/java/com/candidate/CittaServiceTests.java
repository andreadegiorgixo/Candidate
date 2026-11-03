package com.candidate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import com.candidate.dto.CittaDTO;
import com.candidate.entity.Account;
import com.candidate.entity.Candidature;
import com.candidate.entity.Modalita;
import com.candidate.entity.StatoCandidatura;
import com.candidate.exception.CittaAlreadyExistsException;
import com.candidate.exception.CittaInUseException;
import com.candidate.exception.ResourceNotFoundException;
import com.candidate.repository.RepositoryAccount;
import com.candidate.repository.RepositoryCandidature;
import com.candidate.repository.RepositoryCitta;
import com.candidate.service.CittaService;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class CittaServiceTests {

	@Autowired
	private CittaService service;

	@Autowired
	private RepositoryCitta repositoryCitta;

	@Autowired
	private RepositoryCandidature repositoryCandidature;

	@Autowired
	private RepositoryAccount repositoryAccount;

	@BeforeEach
	void cleanDatabase() {
		repositoryCandidature.deleteAll();
		repositoryAccount.deleteAll();
		repositoryCitta.deleteAll();
	}

	private CittaDTO dto(String nome, String provincia) {
		CittaDTO dto = new CittaDTO();
		dto.setNomeCitta(nome);
		dto.setProvincia(provincia);
		dto.setRegione("Regione");
		dto.setNazione("Italia");
		return dto;
	}

	@Test
	void createSenzaIdCreaLaCitta() {
		CittaDTO creata = service.create(dto("Milano", "MI"));

		assertThat(creata.getId()).isNotNull();
		assertThat(creata.getNomeCitta()).isEqualTo("Milano");
	}

	@Test
	void createIgnoraIdDelClient() {
		CittaDTO esistente = service.create(dto("Milano", "MI"));
		CittaDTO nuova = dto("Roma", "RM");
		nuova.setId(esistente.getId());

		CittaDTO creata = service.create(nuova);

		assertThat(creata.getId()).isNotEqualTo(esistente.getId());
		assertThat(repositoryCitta.findById(esistente.getId()).orElseThrow().getNomeCitta()).isEqualTo("Milano");
	}

	@Test
	void createRifiutaCittaDuplicataAncheConMaiuscoleDiverse() {
		service.create(dto("Milano", "MI"));

		assertThatThrownBy(() -> service.create(dto("MILANO", "mi")))
				.isInstanceOf(CittaAlreadyExistsException.class);
	}

	@Test
	void createAccettaStessoNomeInAltraProvincia() {
		service.create(dto("Samone", "TO"));

		assertThat(service.create(dto("Samone", "TN")).getId()).isNotNull();
	}

	@Test
	void updateUsaIdDelParametroENonQuelloDelDto() {
		CittaDTO prima = service.create(dto("Milano", "MI"));
		CittaDTO seconda = service.create(dto("Roma", "RM"));
		CittaDTO modifica = dto("Torino", "TO");
		modifica.setId(seconda.getId());

		CittaDTO aggiornata = service.update(prima.getId(), modifica);

		assertThat(aggiornata.getId()).isEqualTo(prima.getId());
		assertThat(aggiornata.getNomeCitta()).isEqualTo("Torino");
		assertThat(repositoryCitta.findById(seconda.getId()).orElseThrow().getNomeCitta()).isEqualTo("Roma");
		assertThat(repositoryCitta.count()).isEqualTo(2);
	}

	@Test
	void updatePuoMantenereNomeEProvincia() {
		CittaDTO creata = service.create(dto("Milano", "MI"));
		CittaDTO modifica = dto("Milano", "MI");
		modifica.setRegione("Lombardia");

		assertThat(service.update(creata.getId(), modifica).getRegione()).isEqualTo("Lombardia");
	}

	@Test
	void updateRifiutaDatiDiUnAltraCitta() {
		service.create(dto("Milano", "MI"));
		CittaDTO seconda = service.create(dto("Roma", "RM"));

		assertThatThrownBy(() -> service.update(seconda.getId(), dto("Milano", "MI")))
				.isInstanceOf(CittaAlreadyExistsException.class);
	}

	@Test
	void createRimuoveGliSpaziAttorno() {
		service.create(dto(" Milano ", " MI "));

		assertThatThrownBy(() -> service.create(dto("Milano", "MI"))).isInstanceOf(CittaAlreadyExistsException.class);
	}

	@Test
	void findAllOrdinaPerNomeEFiltraPerTesto() {
		service.create(dto("Roma", "RM"));
		service.create(dto("Milano", "MI"));
		service.create(dto("Torino", "TO"));

		assertThat(service.findAll(null)).extracting(CittaDTO::getNomeCitta).containsExactly("Milano", "Roma", "Torino");
		assertThat(service.findAll("  MIL ")).extracting(CittaDTO::getNomeCitta).containsExactly("Milano");
	}

	@Test
	void deleteRifiutaUnaCittaUsataDaUnaCandidatura() {
		CittaDTO citta = service.create(dto("Milano", "MI"));
		Account account = repositoryAccount.save(new Account("Mario", "Rossi", "a@test.it", "x"));
		Candidature candidatura = new Candidature(null, account, "Acme", "Dev", "descrizione", Modalita.REMOTO,
				repositoryCitta.getReferenceById(citta.getId()), StatoCandidatura.IN_FASE_DI_ATTESA,
				LocalDate.of(2026, 11, 1), null, null);
		repositoryCandidature.save(candidatura);

		assertThatThrownBy(() -> service.delete(citta.getId())).isInstanceOf(CittaInUseException.class);

		repositoryCandidature.deleteAll();
		service.delete(citta.getId());
		assertThat(repositoryCitta.existsById(citta.getId())).isFalse();
	}

	@Test
	void updateConIdInesistenteDaNotFound() {
		assertThatThrownBy(() -> service.update(999L, dto("Milano", "MI")))
				.isInstanceOf(ResourceNotFoundException.class);
	}

}
