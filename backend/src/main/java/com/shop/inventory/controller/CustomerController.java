package com.shop.inventory.controller;

import com.shop.inventory.dto.Dtos.CustomerRequest;
import com.shop.inventory.dto.Dtos.PayDueRequest;
import com.shop.inventory.entity.Customer;
import com.shop.inventory.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {
    private final CustomerService service;

    @GetMapping
    public List<Customer> list(@RequestParam(defaultValue = "") String q) { return service.list(q); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Customer create(@Valid @RequestBody CustomerRequest r) { return service.create(r); }

    @PutMapping("/{id}")
    public Customer update(@PathVariable Long id, @Valid @RequestBody CustomerRequest r) { return service.update(id, r); }

    @PostMapping("/{id}/pay")
    public Customer pay(@PathVariable Long id, @Valid @RequestBody PayDueRequest r) { return service.payDue(id, r); }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }
}
