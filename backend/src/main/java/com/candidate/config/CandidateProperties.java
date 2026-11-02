package com.candidate.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "candidate")
public record CandidateProperties(Security security, Cors cors) {

	public record Security(Jwt jwt) {

		public record Jwt(String secret, Duration expiration) {
		}

	}

	public record Cors(List<String> allowedOrigins) {
	}

}
