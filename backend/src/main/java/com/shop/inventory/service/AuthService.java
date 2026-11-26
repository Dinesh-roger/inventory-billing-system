package com.shop.inventory.service;

import com.shop.inventory.dto.Dtos.LoginRequest;
import com.shop.inventory.dto.Dtos.LoginResponse;
import com.shop.inventory.entity.AppUser;
import com.shop.inventory.exception.NotFoundException;
import com.shop.inventory.repository.UserRepository;
import com.shop.inventory.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AuthenticationManager authManager;
    private final UserRepository users;
    private final JwtService jwt;

    public LoginResponse login(LoginRequest r) {
        authManager.authenticate(new UsernamePasswordAuthenticationToken(r.username(), r.password()));
        return toResponse(users.findByUsername(r.username()).orElseThrow(() -> new NotFoundException("User not found")));
    }

    public LoginResponse toResponse(AppUser u) {
        return new LoginResponse(jwt.generate(u.getUsername(), u.getRole().name()), u.getUsername(), u.getFullName(), u.getRole());
    }
}
