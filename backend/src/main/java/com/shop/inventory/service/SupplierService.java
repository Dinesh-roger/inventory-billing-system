package com.shop.inventory.service;

import com.shop.inventory.entity.Supplier;
import com.shop.inventory.exception.NotFoundException;
import com.shop.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierService {
    private final SupplierRepository suppliers;

    public List<Supplier> list() { return suppliers.findAll(Sort.by("name")); }

    @Transactional
    public Supplier create(Supplier in) {
        Supplier s = new Supplier();
        copy(s, in);
        return suppliers.save(s);
    }

    @Transactional
    public Supplier update(Long id, Supplier in) {
        Supplier s = suppliers.findById(id).orElseThrow(() -> new NotFoundException("Supplier not found"));
        copy(s, in);
        return s;
    }

    @Transactional
    public void delete(Long id) {
        if (!suppliers.existsById(id)) throw new NotFoundException("Supplier not found");
        suppliers.deleteById(id);
        suppliers.flush();
    }

    private void copy(Supplier to, Supplier from) {
        to.setName(from.getName().trim());
        to.setPhone(from.getPhone());
        to.setEmail(from.getEmail());
        to.setAddress(from.getAddress());
    }
}
