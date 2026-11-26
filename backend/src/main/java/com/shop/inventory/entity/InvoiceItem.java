package com.shop.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "invoice_items")
@Getter @Setter @NoArgsConstructor
public class InvoiceItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;
    /** Snapshot values: invoice stays correct even if product is edited later. */
    private String productName;
    @Column(precision = 12, scale = 3)
    private BigDecimal quantity;
    @Column(precision = 12, scale = 2) private BigDecimal unitPrice;
    @Column(precision = 12, scale = 2) private BigDecimal costPrice;
    @Column(precision = 5, scale = 2) private BigDecimal gstPercent;
    /** quantity x unitPrice (excluding GST) */
    @Column(precision = 12, scale = 2) private BigDecimal lineTotal;
    @Column(precision = 12, scale = 2) private BigDecimal gstAmount;
}
