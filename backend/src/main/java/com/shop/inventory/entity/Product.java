package com.shop.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "products", indexes = {
        @Index(name = "idx_product_name", columnList = "name"),
        @Index(name = "idx_product_barcode", columnList = "barcode")
})
@Getter @Setter @NoArgsConstructor
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 150)
    private String name;
    @Column(nullable = false, unique = true, length = 100)
    private String sku;
    @Column(length = 100)
    private String barcode;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal costPrice = BigDecimal.ZERO;
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal gstPercent = BigDecimal.ZERO;
    /** pcs, kg, litre, pack, dozen. Price is per this unit. */
    @Column(nullable = false, length = 20)
    private String unit = "pcs";
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal stockQty = BigDecimal.ZERO;
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal reorderLevel = BigDecimal.valueOf(5);
    private boolean active = true;

    /** Optimistic locking: two cashiers selling the same item at the same moment can't corrupt stock. */
    @Version
    private Long version;
}
