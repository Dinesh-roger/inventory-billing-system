package com.shop.inventory.service;

import com.shop.inventory.dto.Dtos.ProductRequest;
import com.shop.inventory.dto.Dtos.ProductResponse;
import com.shop.inventory.entity.MovementType;
import com.shop.inventory.entity.Product;
import com.shop.inventory.exception.BadRequestException;
import com.shop.inventory.exception.NotFoundException;
import com.shop.inventory.repository.CategoryRepository;
import com.shop.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository products;
    private final CategoryRepository categories;
    private final StockService stock;

    @Transactional(readOnly = true)
    public Page<ProductResponse> list(String q, Long categoryId, Pageable pageable) {
        return products.search(q == null ? "" : q.trim(), categoryId, pageable).map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> lowStock() {
        return products.findLowStock().stream().map(ProductResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id) {
        return ProductResponse.from(find(id));
    }

    @Transactional
    public ProductResponse create(ProductRequest r, String username) {
        if (products.existsBySkuIgnoreCase(r.sku().trim())) throw new BadRequestException("SKU already exists: " + r.sku());
        Product p = new Product();
        apply(p, r);
        p.setStockQty(BigDecimal.ZERO);
        p = products.save(p);
        BigDecimal opening = r.stockQty() == null ? BigDecimal.ZERO : r.stockQty();
        if (opening.signum() > 0) stock.record(p, MovementType.IN, opening, "Opening stock", null, username);
        return ProductResponse.from(p);
    }

    /** Stock quantity is NOT changed here. Use purchases (stock in) or stock adjustment so history stays correct. */
    @Transactional
    public ProductResponse update(Long id, ProductRequest r) {
        Product p = find(id);
        if (products.existsBySkuIgnoreCaseAndIdNot(r.sku().trim(), id)) throw new BadRequestException("SKU already exists: " + r.sku());
        apply(p, r);
        return ProductResponse.from(p);
    }

    /** Soft delete: old invoices still need the product. SKU is renamed so it can be reused. */
    @Transactional
    public void delete(Long id) {
        Product p = find(id);
        p.setActive(false);
        p.setSku(p.getSku() + "~del" + p.getId());
    }

    private Product find(Long id) {
        return products.findById(id).filter(Product::isActive).orElseThrow(() -> new NotFoundException("Product not found"));
    }

    private void apply(Product p, ProductRequest r) {
        p.setName(r.name().trim());
        p.setSku(r.sku().trim());
        p.setBarcode(r.barcode() == null || r.barcode().isBlank() ? null : r.barcode().trim());
        p.setCategory(r.categoryId() == null ? null
                : categories.findById(r.categoryId()).orElseThrow(() -> new NotFoundException("Category not found")));
        p.setPrice(r.price().setScale(2, RoundingMode.HALF_UP));
        p.setCostPrice((r.costPrice() == null ? BigDecimal.ZERO : r.costPrice()).setScale(2, RoundingMode.HALF_UP));
        p.setGstPercent((r.gstPercent() == null ? BigDecimal.ZERO : r.gstPercent()).setScale(2, RoundingMode.HALF_UP));
        p.setReorderLevel(r.reorderLevel() == null ? BigDecimal.valueOf(5) : r.reorderLevel());
        p.setUnit(r.unit() == null || r.unit().isBlank() ? "pcs" : r.unit().trim().toLowerCase());
    }
}
