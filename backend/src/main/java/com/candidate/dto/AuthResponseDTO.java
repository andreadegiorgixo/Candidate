package com.candidate.dto;

import java.time.Instant;

public record AuthResponseDTO(String accessToken, String tokenType, Instant expiresAt, AccountDTO account) {
}
