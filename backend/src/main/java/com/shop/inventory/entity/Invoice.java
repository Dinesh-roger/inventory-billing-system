package com.shop.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices", indexes = @Index(name = "idx_invoice_created", columnList = "created_at"))
@Getter @Setter @NoArgsConstructor
public class Invoice {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 40)
    private String invoiceNumber;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(precision = 12, scale = 2) private BigDecimal subTotal = BigDecimal.ZERO;
    @Column(precision = 12, scale = 2) private BigDecimal discount = BigDecimal.ZERO;
    @Column(precision = 12, scale = 2) private BigDecimal gstAmount = BigDecimal.ZERO;
    @Column(precision = 12, scale = 2) private BigDecimal totalAmount = BigDecimal.ZERO;
    @Column(precision = 12, scale = 2) private BigDecimal paidAmount = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING) @Column(length = 20)
    private PaymentMode paymentMode;
    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceItem> items = new ArrayList<>();
}
