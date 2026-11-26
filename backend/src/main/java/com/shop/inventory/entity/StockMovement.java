package com.shop.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements", indexes = @Index(name = "idx_movement_created", columnList = "created_at"))
@Getter @Setter @NoArgsConstructor
public class StockMovement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;
    @Enumerated(EnumType.STRING) @Column(length = 20)
    private MovementType type;
    /** Signed: +10 for stock in, -0.5 for a sale */
    @Column(precision = 12, scale = 3)
    private BigDecimal quantity;
    @Column(precision = 12, scale = 3)
    private BigDecimal balanceAfter;
    private String reason;
    private String reference;
    private String createdBy;
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
