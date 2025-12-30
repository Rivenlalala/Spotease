package com.spotease.repository;

import com.spotease.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findBySpotifyUserId(String spotifyUserId);

    Optional<User> findByEmail(String email);
}
