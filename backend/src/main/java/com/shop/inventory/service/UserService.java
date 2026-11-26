package com.shop.inventory.service;

import com.shop.inventory.dto.Dtos.UserRequest;
import com.shop.inventory.dto.Dtos.UserResponse;
import com.shop.inventory.entity.AppUser;
import com.shop.inventory.exception.BadRequestException;
import com.shop.inventory.exception.NotFoundException;
import com.shop.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository users;
    private final PasswordEncoder encoder;

    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        return users.findAll().stream().map(UserResponse::from).toList();
    }

    @Transactional
    public UserResponse create(UserRequest r) {
        if (users.existsByUsername(r.username().trim())) throw new BadRequestException("Username already taken");
        if (r.password() == null || r.password().length() < 6) throw new BadRequestException("Password must be at least 6 characters");
        AppUser u = new AppUser();
        u.setUsername(r.username().trim());
        u.setPassword(encoder.encode(r.password()));
        apply(u, r);
        return UserResponse.from(users.save(u));
    }

    @Transactional
    public UserResponse update(Long id, UserRequest r, String currentUsername) {
        AppUser u = users.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        if (r.password() != null && !r.password().isBlank()) {
            if (r.password().length() < 6) throw new BadRequestException("Password must be at least 6 characters");
            u.setPassword(encoder.encode(r.password()));
        }
        boolean self = u.getUsername().equals(currentUsername);
        if (self && (Boolean.FALSE.equals(r.active()) || r.role() != u.getRole())) {
            throw new BadRequestException("You cannot disable or change the role of your own account");
        }
        apply(u, r);
        return UserResponse.from(u);
    }

    /** Users are deactivated, not deleted, because invoices refer to them. */
    @Transactional
    public void deactivate(Long id, String currentUsername) {
        AppUser u = users.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        if (u.getUsername().equals(currentUsername)) throw new BadRequestException("You cannot deactivate your own account");
        u.setActive(false);
    }

    private void apply(AppUser u, UserRequest r) {
        u.setFullName(r.fullName().trim());
        u.setEmail(r.email());
        u.setRole(r.role());
        u.setActive(r.active() == null || r.active());
    }
}
