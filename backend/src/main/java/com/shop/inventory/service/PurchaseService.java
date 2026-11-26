package com.shop.inventory.service;

import com.shop.inventory.dto.Dtos.PurchaseRequest;
import com.shop.inventory.dto.Dtos.PurchaseResponse;
import com.shop.inventory.entity.*;
import com.shop.inventory.exception.NotFoundException;
import com.shop.inventory.repository.ProductRepository;
import com.shop.inventory.repository.PurchaseRepository;
import com.shop.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class PurchaseService {
    private final PurchaseRepository purchases;
    private final SupplierRepository suppliers;
    private final ProductRepository products;
    private final StockService stock;

    /** Stock IN: every purchase line increases stock, updates cost price and writes stock history. */
    @Transactional
    public PurchaseResponse create(PurchaseRequest req, String username) {
        Supplier supplier = suppliers.findById(req.supplierId()).orElseThrow(() -> new NotFoundException("Supplier not found"));
        Purchase p = new Purchase();
        p.setSupplier(supplier);
        p.setPurchaseDate(req.purchaseDate() == null ? LocalDate.now() : req.purchaseDate());
        p.setReferenceNo(req.referenceNo());
        p.setCreatedBy(username);
        p = purchases.save(p);

        BigDecimal total = BigDecimal.ZERO;
        for (PurchaseRequest.PurchaseLine line : req.items()) {
            Product product = products.findById(line.productId()).filter(Product::isActive)
                    .orElseThrow(() -> new NotFoundException("Product not found: " + line.productId()));
            PurchaseItem item = new PurchaseItem();
            item.setPurchase(p);
            item.setProduct(product);
            item.setQuantity(line.quantity());
            item.setUnitCost(line.unitCost());
            p.getItems().add(item);
            total = total.add(line.unitCost().multiply(line.quantity()));
            product.setCostPrice(line.unitCost());
            stock.record(product, MovementType.IN, line.quantity(), "Purchase from " + supplier.getName(), "PUR-" + p.getId(), username);
        }
        p.setTotalAmount(total);
        return PurchaseResponse.from(p);
    }

    @Transactional(readOnly = true)
    public Page<PurchaseResponse> list(Pageable pageable) {
        return purchases.findAll(pageable).map(PurchaseResponse::from);
    }
}
