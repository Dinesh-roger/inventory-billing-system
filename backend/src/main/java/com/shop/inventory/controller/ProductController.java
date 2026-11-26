package com.shop.inventory.controller;

import com.shop.inventory.dto.Dtos.ProductRequest;
import com.shop.inventory.dto.Dtos.ProductResponse;
import com.shop.inventory.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
    private static final Set<String> SORTABLE = Set.of("name", "price", "stockQty", "sku");
    private final ProductService service;

    /** Admin and staff can view and search. */
    @GetMapping
    public Page<ProductResponse> list(@RequestParam(defaultValue = "") String q,
                                      @RequestParam(required = false) Long categoryId,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "10") int size,
                                      @RequestParam(defaultValue = "name") String sort,
                                      @RequestParam(defaultValue = "asc") String dir) {
        String sortField = SORTABLE.contains(sort) ? sort : "name";
        Sort.Direction direction = "desc".equalsIgnoreCase(dir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return service.list(q, categoryId, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 500), Sort.by(direction, sortField)));
    }

    @GetMapping("/low-stock")
    public List<ProductResponse> lowStock() { return service.lowStock(); }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable Long id) { return service.get(id); }

    // ---- Admin only: add, update, delete ----
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody ProductRequest r, Authentication auth) {
        return service.create(r, auth.getName());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest r) {
        return service.update(id, r);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }
}
