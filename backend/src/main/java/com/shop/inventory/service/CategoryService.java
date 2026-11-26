package com.shop.inventory.service;

import com.shop.inventory.entity.Category;
import com.shop.inventory.exception.BadRequestException;
import com.shop.inventory.exception.NotFoundException;
import com.shop.inventory.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categories;

    public List<Category> list() { return categories.findAll(Sort.by("name")); }

    @Transactional
    public Category create(String name) {
        if (categories.existsByNameIgnoreCase(name.trim())) throw new BadRequestException("Category already exists");
        Category c = new Category();
        c.setName(name.trim());
        return categories.save(c);
    }

    @Transactional
    public Category update(Long id, String name) {
        Category c = categories.findById(id).orElseThrow(() -> new NotFoundException("Category not found"));
        c.setName(name.trim());
        return c;
    }

    @Transactional
    public void delete(Long id) {
        if (!categories.existsById(id)) throw new NotFoundException("Category not found");
        categories.deleteById(id);
        categories.flush(); // surfaces FK errors (category in use) here
    }
}
