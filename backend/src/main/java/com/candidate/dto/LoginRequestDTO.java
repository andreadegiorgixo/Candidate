package com.candidate.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequestDTO(@NotBlank String email, @NotBlank String password) {

    // evita che la password finisca nei log
    @Override
    public String toString() {
        return "LoginRequestDTO[email=" + email + "]";
    }
}
