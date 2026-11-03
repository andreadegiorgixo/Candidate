package com.candidate;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

	// i test non dipendono dal .env: usano un segreto JWT proprio (solo per i test)
	@Bean
	DynamicPropertyRegistrar jwtSecretForTests() {
		return registry -> registry.add("candidate.security.jwt.secret", () -> "chiave-solo-per-i-test-0123456789-abcdef");
	}

	@Bean
	@ServiceConnection
	PostgreSQLContainer postgresContainer() {
		return new PostgreSQLContainer(DockerImageName.parse("postgres:18-alpine"));
	}

}
