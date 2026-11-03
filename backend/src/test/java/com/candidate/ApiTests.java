package com.candidate;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.candidate.repository.RepositoryAccount;
import com.candidate.repository.RepositoryCandidature;
import com.candidate.repository.RepositoryCitta;
import com.jayway.jsonpath.JsonPath;

/** Test end-to-end dello strato HTTP: sicurezza, JSON, validazione e codici di stato. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class ApiTests {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private RepositoryCandidature repositoryCandidature;

	@Autowired
	private RepositoryAccount repositoryAccount;

	@Autowired
	private RepositoryCitta repositoryCitta;

	@BeforeEach
	void cleanDatabase() {
		repositoryCandidature.deleteAll();
		repositoryAccount.deleteAll();
		repositoryCitta.deleteAll();
	}

	private static String accountJson(String email, String password) {
		return """
				{"nome":"Mario","cognome":"Rossi","email":"%s","password":"%s"}""".formatted(email, password);
	}

	private ResultActions register(String email, String password) throws Exception {
		return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
				.content(accountJson(email, password)));
	}

	private String token(String email) throws Exception {
		String body = register(email, "password-lunga").andExpect(status().isCreated()).andReturn().getResponse()
				.getContentAsString();
		return JsonPath.read(body, "$.accessToken");
	}

	private long accountId(String email) {
		return repositoryAccount.findByEmail(email).orElseThrow().getId();
	}

	private long creaCitta(String token, String nome) throws Exception {
		String body = mvc.perform(post("/api/citta").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nomeCitta":"%s","provincia":"MI","regione":"Lombardia","nazione":"Italia"}""".formatted(nome)))
				.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return ((Number) JsonPath.read(body, "$.id")).longValue();
	}

	private static String candidaturaJson(String azienda, long idCitta) {
		return """
				{"nomeAzienda":"%s","posizioneLavorativa":"Backend Developer","jobOffert":"descrizione",
				"modalita":"IBRIDO","citta":{"id":%d},"statoCandidatura":"IN_FASE_DI_ATTESA",
				"dataCandidatura":"2026-11-01"}""".formatted(azienda, idCitta);
	}

	private ResultActions creaCandidatura(String token, String azienda, long idCitta) throws Exception {
		return mvc.perform(post("/api/candidatura").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content(candidaturaJson(azienda, idCitta)));
	}

	@Test
	void senzaTokenLeApiProtetteDanno401() throws Exception {
		mvc.perform(get("/api/candidatura")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/citta")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/account/me")).andExpect(status().isUnauthorized());
	}

	@Test
	void registrazioneRestituisceTokenENonEsponeLaPassword() throws Exception {
		register("mario@test.it", "password-lunga")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.accessToken").isNotEmpty())
				.andExpect(jsonPath("$.tokenType").value("Bearer"))
				.andExpect(jsonPath("$.account.email").value("mario@test.it"))
				.andExpect(jsonPath("$.account.password").doesNotExist())
				.andExpect(content().string(not(containsString("password-lunga"))));
	}

	@Test
	void registrazioneValidaIDati() throws Exception {
		mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nome":"","cognome":"Rossi","email":"non-una-email","password":"corta"}"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.nome").exists())
				.andExpect(jsonPath("$.errors.email").exists())
				.andExpect(jsonPath("$.errors.password").exists());

		mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nome":"Mario","cognome":"Rossi","email":"mario@test.it"}"""))
				.andExpect(status().isBadRequest());
	}

	@Test
	void registrazioneConEmailGiaUsataDa409() throws Exception {
		register("mario@test.it", "password-lunga").andExpect(status().isCreated());

		register("MARIO@test.it", "password-lunga").andExpect(status().isConflict());
	}

	@Test
	void loginConCredenzialiGiusteESbagliate() throws Exception {
		register("mario@test.it", "password-lunga").andExpect(status().isCreated());

		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"Mario@Test.it","password":"password-lunga"}"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.accessToken").isNotEmpty());

		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"mario@test.it","password":"sbagliata"}"""))
				.andExpect(status().isUnauthorized());

		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"sconosciuto@test.it","password":"password-lunga"}"""))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void unAccountVedeSoloSeStesso() throws Exception {
		String tokenMario = token("mario@test.it");
		token("luigi@test.it");

		mvc.perform(get("/api/account/me").header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value("mario@test.it"));
		mvc.perform(get("/api/account/" + accountId("mario@test.it")).header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isOk());
		mvc.perform(get("/api/account/" + accountId("luigi@test.it")).header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isForbidden());
		mvc.perform(put("/api/account/" + accountId("luigi@test.it")).header("Authorization", "Bearer " + tokenMario)
				.contentType(MediaType.APPLICATION_JSON).content(accountJson("hack@test.it", "password-lunga")))
				.andExpect(status().isForbidden());
		mvc.perform(delete("/api/account/delete/" + accountId("luigi@test.it"))
				.header("Authorization", "Bearer " + tokenMario)).andExpect(status().isForbidden());
	}

	@Test
	void modificaEEliminazioneDelProprioAccount() throws Exception {
		String tokenMario = token("mario@test.it");
		long id = accountId("mario@test.it");

		mvc.perform(put("/api/account/" + id).header("Authorization", "Bearer " + tokenMario)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nome":"Marco","cognome":"Rossi","email":"mario@test.it"}"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.nome").value("Marco"));

		mvc.perform(delete("/api/account/delete/" + id).header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isNoContent());
		mvc.perform(get("/api/account/me").header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isNotFound());
	}

	@Test
	void ognunoVedeSoloLeProprieCandidature() throws Exception {
		String tokenMario = token("mario@test.it");
		String tokenLuigi = token("luigi@test.it");
		long idCitta = creaCitta(tokenMario, "Milano");

		String body = creaCandidatura(tokenMario, "Acme", idCitta)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.idAccount").value(accountId("mario@test.it")))
				.andExpect(jsonPath("$.citta.nomeCitta").value("Milano"))
				.andReturn().getResponse().getContentAsString();
		long id = ((Number) JsonPath.read(body, "$.id")).longValue();

		mvc.perform(get("/api/candidatura").header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
		mvc.perform(get("/api/candidatura").header("Authorization", "Bearer " + tokenLuigi))
				.andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
		mvc.perform(get("/api/candidatura/" + id).header("Authorization", "Bearer " + tokenLuigi))
				.andExpect(status().isNotFound());
		mvc.perform(put("/api/candidatura/" + id).header("Authorization", "Bearer " + tokenLuigi)
				.contentType(MediaType.APPLICATION_JSON).content(candidaturaJson("Hack", idCitta)))
				.andExpect(status().isNotFound());
		mvc.perform(delete("/api/candidatura/delete/" + id).header("Authorization", "Bearer " + tokenLuigi))
				.andExpect(status().isNotFound());
		mvc.perform(get("/api/candidatura/azienda").param("nomeAzienda", "acme")
				.header("Authorization", "Bearer " + tokenLuigi))
				.andExpect(jsonPath("$", hasSize(0)));
		mvc.perform(get("/api/candidatura/azienda").param("nomeAzienda", "acme")
				.header("Authorization", "Bearer " + tokenMario))
				.andExpect(jsonPath("$", hasSize(1)));
	}

	@Test
	void ciclodiVitaDiUnaCandidatura() throws Exception {
		String tokenMario = token("mario@test.it");
		long idCitta = creaCitta(tokenMario, "Milano");
		String body = creaCandidatura(tokenMario, "Acme", idCitta).andReturn().getResponse().getContentAsString();
		long id = ((Number) JsonPath.read(body, "$.id")).longValue();

		mvc.perform(patch("/api/candidatura/" + id + "/stato").header("Authorization", "Bearer " + tokenMario)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"statoCandidatura":"FASE_DI_COLLOQUIO_TECNICO_1"}"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.statoCandidatura").value("FASE_DI_COLLOQUIO_TECNICO_1"));
		mvc.perform(get("/api/candidatura/stato").param("statoCandidatura", "FASE_DI_COLLOQUIO_TECNICO_1")
				.header("Authorization", "Bearer " + tokenMario))
				.andExpect(jsonPath("$", hasSize(1)));
		mvc.perform(get("/api/candidatura/citta").param("nomeCitta", "milano")
				.header("Authorization", "Bearer " + tokenMario))
				.andExpect(jsonPath("$", hasSize(1)));

		mvc.perform(delete("/api/candidatura/delete/" + id).header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isNoContent());
		mvc.perform(get("/api/candidatura/" + id).header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isNotFound());
	}

	@Test
	void candidaturaNonValidaDa400() throws Exception {
		String tokenMario = token("mario@test.it");
		long idCitta = creaCitta(tokenMario, "Milano");

		mvc.perform(post("/api/candidatura").header("Authorization", "Bearer " + tokenMario)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nomeAzienda":"","modalita":"IBRIDO"}"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.nomeAzienda").exists())
				.andExpect(jsonPath("$.errors.citta").exists())
				.andExpect(jsonPath("$.errors.statoCandidatura").exists());

		// citta' senza id, valore di enum sconosciuto, JSON malformato
		mvc.perform(post("/api/candidatura").header("Authorization", "Bearer " + tokenMario)
				.contentType(MediaType.APPLICATION_JSON)
				.content(candidaturaJson("Acme", idCitta).replace("{\"id\":" + idCitta + "}", "{}")))
				.andExpect(status().isBadRequest());
		mvc.perform(post("/api/candidatura").header("Authorization", "Bearer " + tokenMario)
				.contentType(MediaType.APPLICATION_JSON)
				.content(candidaturaJson("Acme", idCitta).replace("IBRIDO", "SULLA_LUNA")))
				.andExpect(status().isBadRequest());
		mvc.perform(post("/api/candidatura").header("Authorization", "Bearer " + tokenMario)
				.contentType(MediaType.APPLICATION_JSON).content("{non json"))
				.andExpect(status().isBadRequest());
		mvc.perform(get("/api/candidatura/stato").param("statoCandidatura", "BOH")
				.header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isBadRequest());
		mvc.perform(get("/api/candidatura/citta").param("nomeCitta", " ")
				.header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isBadRequest());

		creaCandidatura(tokenMario, "Acme", 999999L).andExpect(status().isNotFound());
	}

	@Test
	void cittaCrudEConflitti() throws Exception {
		String tokenMario = token("mario@test.it");
		long idMilano = creaCitta(tokenMario, "Milano");

		mvc.perform(post("/api/citta").header("Authorization", "Bearer " + tokenMario)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nomeCitta":"MILANO","provincia":"mi","regione":"Lombardia","nazione":"Italia"}"""))
				.andExpect(status().isConflict());
		mvc.perform(post("/api/citta").header("Authorization", "Bearer " + tokenMario)
				.contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest());

		mvc.perform(get("/api/citta").param("nome", "mil").header("Authorization", "Bearer " + tokenMario))
				.andExpect(jsonPath("$", hasSize(1)));
		mvc.perform(get("/api/citta/" + idMilano).header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isOk());

		// una citta' usata da una candidatura non si elimina
		creaCandidatura(tokenMario, "Acme", idMilano).andExpect(status().isCreated());
		mvc.perform(delete("/api/citta/delete/" + idMilano).header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isConflict());

		long idRoma = creaCitta(tokenMario, "Roma");
		mvc.perform(delete("/api/citta/delete/" + idRoma).header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isNoContent());
		mvc.perform(get("/api/citta/" + idRoma).header("Authorization", "Bearer " + tokenMario))
				.andExpect(status().isNotFound());
	}

}
