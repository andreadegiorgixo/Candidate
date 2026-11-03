package com.candidate.dto;

import com.candidate.entity.StatoCandidatura;

import jakarta.validation.constraints.NotNull;

public record StatoUpdateDTO(@NotNull StatoCandidatura statoCandidatura) {
}
