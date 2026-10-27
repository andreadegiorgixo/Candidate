package com.candidate;

import org.springframework.boot.SpringApplication;

public class TestCandidateApplication {

	public static void main(String[] args) {
		SpringApplication.from(CandidateApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
