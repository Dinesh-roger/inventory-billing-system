package com.shop.inventory.controller;

import com.shop.inventory.dto.Dtos.AdjustRequest;
import com.shop.inventory.dto.Dtos.StockMovementResponse;
import com.shop.inventory.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class StockController {
    private final StockService service;

    @GetMapping("/movements")
    public Page<StockMovementResponse> movements(@RequestParam(required = false) Long productId,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "15") int size) {
        return service.history(productId, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }

    @PostMapping("/adjust")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void adjust(@Valid @RequestBody AdjustRequest r, Authentication auth) { service.adjust(r, auth.getName()); }
}
