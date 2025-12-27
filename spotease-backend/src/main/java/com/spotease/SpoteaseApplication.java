package com.spotease;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class SpoteaseApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpoteaseApplication.class, args);
    }
}
