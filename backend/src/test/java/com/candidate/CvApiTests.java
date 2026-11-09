package com.candidate;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.candidate.repository.RepositoryAccount;
import com.candidate.repository.RepositoryCv;
import com.jayway.jsonpath.JsonPath;

/** Test dello strato HTTP per i CV caricati come file e per il link LinkedIn dell'account. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class CvApiTests {

	private static final String PDF = "application/pdf";
	private static final String DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private RepositoryAccount repositoryAccount;

	@Autowired
	private RepositoryCv repositoryCv;

	@BeforeEach
	void cleanDatabase() {
		repositoryCv.deleteAll();
		repositoryAccount.deleteAll();
	}

	private String token(String email) throws Exception {
		String body = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nome":"Mario","cognome":"Rossi","email":"%s","password":"password-lunga"}""".formatted(email)))
				.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return JsonPath.read(body, "$.accessToken");
	}

	private long accountId(String email) {
		return repositoryAccount.findByEmail(email).orElseThrow().getId();
	}

	private static MockMultipartFile file(String nomeFile, String contentType, byte[] bytes) {
		return new MockMultipartFile("file", nomeFile, contentType, bytes);
	}

	private ResultActions carica(String token, String nome, MockMultipartFile file) throws Exception {
		var richiesta = multipart("/api/cv").header("Authorization", "Bearer " + token);
		if (file != null) {
			richiesta.file(file);
		}
		if (nome != null) {
			richiesta.param("nome", nome);
		}
		return mvc.perform(richiesta);
	}

	private ResultActions modifica(String token, long id, String nome, MockMultipartFile file) throws Exception {
		var richiesta = multipart(HttpMethod.PUT, "/api/cv/" + id).header("Authorization", "Bearer " + token);
		if (file != null) {
			richiesta.file(file);
		}
		return mvc.perform(richiesta.param("nome", nome));
	}

	private long creaCv(String token, String nome) throws Exception {
		String body = carica(token, nome, file("cv.pdf", PDF, "%PDF-1.4 contenuto".getBytes()))
				.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return ((Number) JsonPath.read(body, "$.id")).longValue();
	}

	@Test
	void senzaTokenLeApiDeiCvDanno401() throws Exception {
		mvc.perform(get("/api/cv")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/cv/1/file")).andExpect(status().isUnauthorized());
		mvc.perform(multipart("/api/cv").file(file("cv.pdf", PDF, new byte[] { 1 }))).andExpect(status().isUnauthorized());
	}

	@Test
	void caricamentoElencoEScarico() throws Exception {
		String token = token("mario@test.it");
		byte[] bytes = "%PDF-1.4 il mio curriculum".getBytes();

		carica(token, "  Versione tecnica ", file("Mario Rossi - CV.PDF", PDF, bytes))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").isNotEmpty())
				.andExpect(jsonPath("$.nome").value("Versione tecnica"))
				.andExpect(jsonPath("$.nomeFile").value("Mario Rossi - CV.PDF"))
				.andExpect(jsonPath("$.contentType").value(PDF))
				.andExpect(jsonPath("$.dimensione").value(bytes.length))
				.andExpect(jsonPath("$.dataCaricamento").isNotEmpty())
				.andExpect(jsonPath("$.contenuto").doesNotExist());

		String elenco = mvc.perform(get("/api/cv").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].nome").value("Versione tecnica"))
				.andExpect(jsonPath("$[0].contenuto").doesNotExist())
				.andReturn().getResponse().getContentAsString();
		long id = ((Number) JsonPath.read(elenco, "$[0].id")).longValue();

		mvc.perform(get("/api/cv/" + id + "/file").header("Authorization", "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(content().contentType(PDF))
				.andExpect(header().string("Content-Disposition", containsString("attachment")))
				.andExpect(header().string("Content-Disposition", containsString("Mario")))
				.andExpect(content().bytes(bytes));
	}

	@Test
	void accettaDocEDocx() throws Exception {
		String token = token("mario@test.it");
		carica(token, "Word", file("cv.docx", DOCX, new byte[] { 'P', 'K', 3, 4 })).andExpect(status().isCreated())
				.andExpect(jsonPath("$.contentType").value(DOCX));
		carica(token, "Vecchio", file("cv.doc", "application/msword", new byte[] { 1, 2, 3 }))
				.andExpect(status().isCreated());
		// il content type puo' arrivare con parametri
		carica(token, "Con parametri", file("cv.pdf", "application/pdf; charset=binary", new byte[] { 1 }))
				.andExpect(status().isCreated());
	}

	@Test
	void rifiutaTipiNonAmmessi() throws Exception {
		String token = token("mario@test.it");

		// estensione non ammessa
		carica(token, "Testo", file("cv.txt", "text/plain", new byte[] { 1 }))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.file").value(containsString("PDF, DOC o DOCX")));
		// estensione giusta ma content type sbagliato
		carica(token, "Finto", file("cv.pdf", "image/png", new byte[] { 1 })).andExpect(status().isBadRequest());
		// content type giusto ma estensione sbagliata
		carica(token, "Finto", file("cv.exe", PDF, new byte[] { 1 })).andExpect(status().isBadRequest());
		// estensione e content type ammessi ma non corrispondenti
		carica(token, "Finto", file("cv.docx", PDF, new byte[] { 1 })).andExpect(status().isBadRequest());
		// senza estensione
		carica(token, "Niente", file("cv", PDF, new byte[] { 1 })).andExpect(status().isBadRequest());

		mvc.perform(get("/api/cv").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void rifiutaNomeEFileMancanti() throws Exception {
		String token = token("mario@test.it");

		carica(token, " ", file("cv.pdf", PDF, new byte[] { 1 })).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.nome").exists());
		carica(token, null, file("cv.pdf", PDF, new byte[] { 1 })).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.nome").exists());
		carica(token, "Senza file", null).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.file").exists());
		carica(token, "Vuoto", file("cv.pdf", PDF, new byte[0])).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.file").exists());
	}

	@Test
	void rifiutaFileOltreICinqueMegabyte() throws Exception {
		String token = token("mario@test.it");

		carica(token, "Enorme", file("cv.pdf", PDF, new byte[5 * 1024 * 1024 + 1]))
				.andExpect(status().isPayloadTooLarge())
				.andExpect(jsonPath("$.detail").value(containsString("5 MB")))
				.andExpect(jsonPath("$.errors.file").exists());
		// esattamente 5 MB e' ammesso
		carica(token, "Al limite", file("cv.pdf", PDF, new byte[5 * 1024 * 1024])).andExpect(status().isCreated());
	}

	@Test
	void ognunoVedeSoloIPropriCv() throws Exception {
		String tokenMario = token("mario@test.it");
		String tokenLuigi = token("luigi@test.it");
		long id = creaCv(tokenMario, "Di Mario");

		mvc.perform(get("/api/cv").header("Authorization", "Bearer " + tokenLuigi))
				.andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
		mvc.perform(get("/api/cv/" + id + "/file").header("Authorization", "Bearer " + tokenLuigi))
				.andExpect(status().isNotFound());
		modifica(tokenLuigi, id, "Rubato", null).andExpect(status().isNotFound());
		modifica(tokenLuigi, id, "Rubato", file("cv.pdf", PDF, new byte[] { 9 })).andExpect(status().isNotFound());
		mvc.perform(delete("/api/cv/" + id).header("Authorization", "Bearer " + tokenLuigi))
				.andExpect(status().isNotFound());

		// il CV di Mario e' intatto
		mvc.perform(get("/api/cv").header("Authorization", "Bearer " + tokenMario))
				.andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].nome").value("Di Mario"));
		mvc.perform(get("/api/cv/" + id + "/file").header("Authorization", "Bearer " + tokenMario))
				.andExpect(content().bytes("%PDF-1.4 contenuto".getBytes()));
	}

	@Test
	void rinominaESostituisceIlFile() throws Exception {
		String token = token("mario@test.it");
		long id = creaCv(token, "Prima");

		// solo il nome: il file resta
		modifica(token, id, "Dopo", null).andExpect(status().isOk())
				.andExpect(jsonPath("$.nome").value("Dopo"))
				.andExpect(jsonPath("$.nomeFile").value("cv.pdf"));
		mvc.perform(get("/api/cv/" + id + "/file").header("Authorization", "Bearer " + token))
				.andExpect(content().bytes("%PDF-1.4 contenuto".getBytes()));

		// nome e file nuovo
		byte[] nuovo = { 'P', 'K', 3, 4, 5 };
		modifica(token, id, "Dopo", file("nuovo.docx", DOCX, nuovo)).andExpect(status().isOk())
				.andExpect(jsonPath("$.nomeFile").value("nuovo.docx"))
				.andExpect(jsonPath("$.contentType").value(DOCX))
				.andExpect(jsonPath("$.dimensione").value(nuovo.length));
		mvc.perform(get("/api/cv/" + id + "/file").header("Authorization", "Bearer " + token))
				.andExpect(content().contentType(DOCX)).andExpect(content().bytes(nuovo));

		// il file nuovo non valido non cambia nulla
		modifica(token, id, "Altro", file("x.txt", "text/plain", new byte[] { 1 })).andExpect(status().isBadRequest());
		mvc.perform(get("/api/cv").header("Authorization", "Bearer " + token))
				.andExpect(jsonPath("$[0].nome").value("Dopo")).andExpect(jsonPath("$[0].nomeFile").value("nuovo.docx"));

		modifica(token, id, "", null).andExpect(status().isBadRequest());
		modifica(token, 999999L, "Boh", null).andExpect(status().isNotFound());
	}

	@Test
	void eliminaUnCv() throws Exception {
		String token = token("mario@test.it");
		long id = creaCv(token, "Da togliere");

		mvc.perform(delete("/api/cv/" + id).header("Authorization", "Bearer " + token))
				.andExpect(status().isNoContent());
		mvc.perform(get("/api/cv/" + id + "/file").header("Authorization", "Bearer " + token))
				.andExpect(status().isNotFound());
		mvc.perform(get("/api/cv").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void eliminandoLAccountSiCancellanoISuoiCv() throws Exception {
		String token = token("mario@test.it");
		creaCv(token, "Uno");
		creaCv(token, "Due");
		long idAccount = accountId("mario@test.it");

		mvc.perform(delete("/api/account/delete/" + idAccount).header("Authorization", "Bearer " + token))
				.andExpect(status().isNoContent());

		org.assertj.core.api.Assertions.assertThat(repositoryCv.count()).isZero();
	}

	// ---------------------------------------------------------------- LinkedIn

	private ResultActions aggiornaAccount(String token, String email, String linkedinJson) throws Exception {
		return mvc.perform(put("/api/account/" + accountId(email)).header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nome":"Mario","cognome":"Rossi","email":"%s"%s}""".formatted(email, linkedinJson)));
	}

	@Test
	void linkedinSiImpostaSiLeggeESiRimuove() throws Exception {
		String token = token("mario@test.it");

		mvc.perform(get("/api/account/me").header("Authorization", "Bearer " + token))
				.andExpect(jsonPath("$.linkedin").doesNotExist());

		aggiornaAccount(token, "mario@test.it", ",\"linkedin\":\"https://www.linkedin.com/in/mario-rossi\"")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.linkedin").value("https://www.linkedin.com/in/mario-rossi"));
		mvc.perform(get("/api/account/me").header("Authorization", "Bearer " + token))
				.andExpect(jsonPath("$.linkedin").value("https://www.linkedin.com/in/mario-rossi"));

		// stringa vuota = rimosso
		aggiornaAccount(token, "mario@test.it", ",\"linkedin\":\"\"").andExpect(status().isOk())
				.andExpect(jsonPath("$.linkedin").doesNotExist());
	}

	@Test
	void linkedinAccettaVariantiValide() throws Exception {
		String token = token("mario@test.it");
		for (String url : new String[] { "https://linkedin.com/in/mario", "http://linkedin.com/in/mario",
				"https://it.linkedin.com/in/mario", "https://WWW.LinkedIn.com/in/mario/?locale=it",
				"https://www.linkedin.com", "  https://www.linkedin.com/in/mario  " }) {
			aggiornaAccount(token, "mario@test.it", ",\"linkedin\":\"" + url + "\"").andExpect(status().isOk());
		}
		aggiornaAccount(token, "mario@test.it", ",\"linkedin\":\"  https://www.linkedin.com/in/mario  \"")
				.andExpect(jsonPath("$.linkedin").value("https://www.linkedin.com/in/mario"));
		// assente o null = nessun link
		aggiornaAccount(token, "mario@test.it", ",\"linkedin\":null").andExpect(status().isOk())
				.andExpect(jsonPath("$.linkedin").doesNotExist());
	}

	@Test
	void linkedinNonValidoDa400() throws Exception {
		String token = token("mario@test.it");
		for (String url : new String[] { "linkedin.com/in/mario", "www.linkedin.com/in/mario", "ftp://linkedin.com/in/mario",
				"https://example.com/in/mario", "https://linkedin.com.evil.com/in/mario",
				"https://evillinkedin.com/in/mario", "https://linkedin.com@evil.com/", "https://example.com/linkedin.com",
				"javascript:alert(1)", "https://www.linkedin.com/in/ma rio", "non un link" }) {
			aggiornaAccount(token, "mario@test.it", ",\"linkedin\":\"" + url + "\"")
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.errors.linkedin").value(containsString("LinkedIn")));
		}
		aggiornaAccount(token, "mario@test.it", ",\"linkedin\":\"https://www.linkedin.com/in/" + "a".repeat(260) + "\"")
				.andExpect(status().isBadRequest());

		mvc.perform(get("/api/account/me").header("Authorization", "Bearer " + token))
				.andExpect(jsonPath("$.linkedin", not(containsString("evil"))));
	}

	@Test
	void linkedinPuoEssereIndicatoGiaInRegistrazione() throws Exception {
		mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"nome":"Mario","cognome":"Rossi","email":"mario@test.it","password":"password-lunga",
						"linkedin":"https://www.linkedin.com/in/mario"}"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.account.linkedin").value("https://www.linkedin.com/in/mario"));
	}

}
