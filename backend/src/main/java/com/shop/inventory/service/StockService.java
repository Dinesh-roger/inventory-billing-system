package com.shop.inventory.service;

import com.shop.inventory.dto.Dtos.AdjustRequest;
import com.shop.inventory.dto.Dtos.StockMovementResponse;
import com.shop.inventory.entity.MovementType;
import com.shop.inventory.entity.Product;
import com.shop.inventory.entity.StockMovement;
import com.shop.inventory.exception.BadRequestException;
import com.shop.inventory.exception.NotFoundException;
import com.shop.inventory.repository.ProductRepository;
import com.shop.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class StockService {
    private final StockMovementRepository movements;
    private final ProductRepository products;

    /** Changes stock of a managed Product and writes a history row. Must run inside a transaction. */
    @Transactional
    public void record(Product p, MovementType type, BigDecimal change, String reason, String reference, String user) {
        BigDecimal delta = change.setScale(3, RoundingMode.HALF_UP);
        BigDecimal newQty = p.getStockQty().add(delta);
        if (newQty.signum() < 0) {
            throw new BadRequestException("Stock cannot go below zero for " + p.getName() + " (available "
                    + p.getStockQty().stripTrailingZeros().toPlainString() + " " + p.getUnit() + ")");
        }
        p.setStockQty(newQty);
        StockMovement m = new StockMovement();
        m.setProduct(p);
        m.setType(type);
        m.setQuantity(delta);
        m.setBalanceAfter(newQty);
        m.setReason(reason);
        m.setReference(reference);
        m.setCreatedBy(user);
        m.setCreatedAt(LocalDateTime.now());
        movements.save(m);
    }

    @Transactional
    public void adjust(AdjustRequest r, String user) {
        if (r.quantityChange().signum() == 0) throw new BadRequestException("Quantity change cannot be 0");
        Product p = products.findById(r.productId()).orElseThrow(() -> new NotFoundException("Product not found"));
        record(p, MovementType.ADJUSTMENT, r.quantityChange(), r.reason(), null, user);
    }

    @Transactional(readOnly = true)
    public Page<StockMovementResponse> history(Long productId, Pageable pageable) {
        Page<StockMovement> page = productId == null ? movements.findAll(pageable) : movements.findByProductId(productId, pageable);
        return page.map(StockMovementResponse::from);
    }
}
