package com.candidate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.candidate.dto.AccountDTO;
import com.candidate.exception.BadRequestException;
import com.candidate.exception.EmailAlreadyUsedException;
import com.candidate.exception.ResourceNotFoundException;
import com.candidate.repository.RepositoryAccount;
import com.candidate.repository.RepositoryCandidature;
import com.candidate.service.AccountService;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class AccountServiceTests {

	@Autowired
	private AccountService service;

	@Autowired
	private RepositoryAccount repositoryAccount;

	@Autowired
	private RepositoryCandidature repositoryCandidature;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@BeforeEach
	void cleanDatabase() {
		repositoryCandidature.deleteAll();
		repositoryAccount.deleteAll();
	}

	private AccountDTO dto(String email, String password) {
		AccountDTO dto = new AccountDTO();
		dto.setNome("Mario");
		dto.setCognome("Rossi");
		dto.setEmail(email);
		dto.setPassword(password);
		return dto;
	}

	@Test
	void createCifraLaPasswordEImpostaLaData() {
		AccountDTO creato = service.create(dto("a@test.it", "segreta"));

		assertThat(creato.getId()).isNotNull();
		assertThat(creato.getDataCreazione()).isNotNull();
		assertThat(creato.getPassword()).isNull();
		String salvata = repositoryAccount.findByEmail("a@test.it").orElseThrow().getPassword();
		assertThat(salvata).isNotEqualTo("segreta");
		assertThat(passwordEncoder.matches("segreta", salvata)).isTrue();
	}

	@Test
	void createIgnoraIdDelClientENonSovrascriveAltriAccount() {
		AccountDTO esistente = service.create(dto("a@test.it", "segreta"));
		AccountDTO nuovo = dto("b@test.it", "altra");
		nuovo.setId(esistente.getId());

		AccountDTO creato = service.create(nuovo);

		assertThat(creato.getId()).isNotEqualTo(esistente.getId());
		assertThat(service.getById(esistente.getId()).getEmail()).isEqualTo("a@test.it");
	}

	@Test
	void createRifiutaEmailDuplicata() {
		service.create(dto("a@test.it", "segreta"));

		assertThatThrownBy(() -> service.create(dto("a@test.it", "altra")))
				.isInstanceOf(EmailAlreadyUsedException.class);
	}

	@Test
	void updateSenzaPasswordMantienePasswordEData() {
		AccountDTO creato = service.create(dto("a@test.it", "segreta"));
		AccountDTO modifica = dto("nuova@test.it", null);
		modifica.setNome("Luigi");

		AccountDTO aggiornato = service.update(creato.getId(), modifica);

		assertThat(aggiornato.getNome()).isEqualTo("Luigi");
		assertThat(aggiornato.getDataCreazione()).isEqualTo(creato.getDataCreazione());
		String salvata = repositoryAccount.findByEmail("nuova@test.it").orElseThrow().getPassword();
		assertThat(passwordEncoder.matches("segreta", salvata)).isTrue();
	}

	@Test
	void updateConPasswordLaCifra() {
		AccountDTO creato = service.create(dto("a@test.it", "segreta"));

		service.update(creato.getId(), dto("a@test.it", "nuovapassword"));

		String salvata = repositoryAccount.findByEmail("a@test.it").orElseThrow().getPassword();
		assertThat(passwordEncoder.matches("nuovapassword", salvata)).isTrue();
	}

	@Test
	void updateRifiutaEmailDiUnAltroAccount() {
		service.create(dto("a@test.it", "segreta"));
		AccountDTO secondo = service.create(dto("b@test.it", "segreta"));

		assertThatThrownBy(() -> service.update(secondo.getId(), dto("a@test.it", null)))
				.isInstanceOf(EmailAlreadyUsedException.class);
	}

	@Test
	void createRichiedeLaPassword() {
		assertThatThrownBy(() -> service.create(dto("a@test.it", null))).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> service.create(dto("a@test.it", "  "))).isInstanceOf(BadRequestException.class);
		assertThatThrownBy(() -> service.create(dto("a@test.it", "x".repeat(73)))).isInstanceOf(BadRequestException.class);
	}

	@Test
	void leEmailSonoNormalizzateEUnivocheSenzaDistinguereMaiuscole() {
		AccountDTO creato = service.create(dto("  Mario@Test.IT ", "segreta"));

		assertThat(creato.getEmail()).isEqualTo("mario@test.it");
		assertThatThrownBy(() -> service.create(dto("MARIO@test.it", "segreta")))
				.isInstanceOf(EmailAlreadyUsedException.class);
	}

	@Test
	void idInesistenteDaNotFound() {
		assertThatThrownBy(() -> service.getById(999L)).isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> service.delete(999L)).isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> service.update(999L, dto("a@test.it", null)))
				.isInstanceOf(ResourceNotFoundException.class);
	}

}
