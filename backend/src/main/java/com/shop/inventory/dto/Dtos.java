package com.shop.inventory.dto;

import com.shop.inventory.entity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class Dtos {
    private Dtos() {}

    // ---------- Auth / Users ----------
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record LoginResponse(String token, String username, String fullName, Role role) {}

    public record UserRequest(@NotBlank String username, String password, @NotBlank String fullName,
                              String email, @NotNull Role role, Boolean active) {}
    public record UserResponse(Long id, String username, String fullName, String email, Role role, boolean active) {
        public static UserResponse from(AppUser u) {
            return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getEmail(), u.getRole(), u.isActive());
        }
    }

    // ---------- Products ----------
    public record ProductRequest(
            @NotBlank String name,
            @NotBlank String sku,
            String barcode,
            Long categoryId,
            @NotNull @DecimalMin("0.0") BigDecimal price,
            @DecimalMin("0.0") BigDecimal costPrice,
            @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal gstPercent,
            @DecimalMin("0.0") BigDecimal stockQty,
            @DecimalMin("0.0") BigDecimal reorderLevel,
            String unit) {}

    public record ProductResponse(Long id, String name, String sku, String barcode, Long categoryId, String categoryName,
                                  BigDecimal price, BigDecimal costPrice, BigDecimal gstPercent,
                                  BigDecimal stockQty, BigDecimal reorderLevel, String unit, boolean lowStock) {
        public static ProductResponse from(Product p) {
            Category c = p.getCategory();
            return new ProductResponse(p.getId(), p.getName(), p.getSku(), p.getBarcode(),
                    c == null ? null : c.getId(), c == null ? null : c.getName(),
                    p.getPrice(), p.getCostPrice(), p.getGstPercent(),
                    p.getStockQty(), p.getReorderLevel(), p.getUnit(),
                    p.getStockQty().compareTo(p.getReorderLevel()) <= 0);
        }
    }

    // ---------- Customers ----------
    public record CustomerRequest(@NotBlank String name, String phone, String address) {}
    public record PayDueRequest(@NotNull @DecimalMin("0.01") BigDecimal amount, @NotNull PaymentMode mode) {}

    // ---------- Stock ----------
    public record AdjustRequest(@NotNull Long productId, @NotNull BigDecimal quantityChange, @NotBlank String reason) {}
    public record StockMovementResponse(Long id, Long productId, String productName, String sku, MovementType type,
                                        BigDecimal quantity, BigDecimal balanceAfter, String reason, String reference,
                                        String createdBy, LocalDateTime createdAt) {
        public static StockMovementResponse from(StockMovement m) {
            return new StockMovementResponse(m.getId(), m.getProduct().getId(), m.getProduct().getName(),
                    m.getProduct().getSku(), m.getType(), m.getQuantity(), m.getBalanceAfter(), m.getReason(),
                    m.getReference(), m.getCreatedBy(), m.getCreatedAt());
        }
    }

    // ---------- Purchases ----------
    public record PurchaseRequest(@NotNull Long supplierId, LocalDate purchaseDate, String referenceNo,
                                  @NotEmpty List<@Valid PurchaseLine> items) {
        public record PurchaseLine(@NotNull Long productId, @NotNull @DecimalMin("0.001") BigDecimal quantity,
                                   @NotNull @DecimalMin("0.0") BigDecimal unitCost) {}
    }
    public record PurchaseResponse(Long id, Long supplierId, String supplierName, LocalDate purchaseDate, String referenceNo,
                                   BigDecimal totalAmount, String createdBy, List<PurchaseLineResponse> items) {
        public record PurchaseLineResponse(Long productId, String productName, BigDecimal quantity, BigDecimal unitCost) {}
        public static PurchaseResponse from(Purchase p) {
            return new PurchaseResponse(p.getId(), p.getSupplier().getId(), p.getSupplier().getName(), p.getPurchaseDate(),
                    p.getReferenceNo(), p.getTotalAmount(), p.getCreatedBy(),
                    p.getItems().stream().map(i -> new PurchaseLineResponse(i.getProduct().getId(),
                            i.getProduct().getName(), i.getQuantity(), i.getUnitCost())).toList());
        }
    }

    // ---------- Billing ----------
    public record InvoiceRequest(Long customerId,
                                 @NotEmpty List<@Valid Line> items,
                                 @DecimalMin("0.0") BigDecimal discount,
                                 @NotNull PaymentMode paymentMode,
                                 @DecimalMin("0.0") BigDecimal paidAmount) {
        public record Line(@NotNull Long productId, @NotNull @DecimalMin("0.001") BigDecimal quantity) {}
    }
    public record InvoiceItemResponse(Long productId, String productName, BigDecimal quantity, String unit, BigDecimal unitPrice,
                                      BigDecimal gstPercent, BigDecimal lineTotal, BigDecimal gstAmount) {}
    public record InvoiceResponse(Long id, String invoiceNumber, Long customerId, String customerName, String customerPhone,
                                  String createdBy, LocalDateTime createdAt, BigDecimal subTotal, BigDecimal discount,
                                  BigDecimal gstAmount, BigDecimal totalAmount, BigDecimal paidAmount, BigDecimal dueAmount,
                                  PaymentMode paymentMode, List<InvoiceItemResponse> items) {
        public static InvoiceResponse from(Invoice i) {
            Customer c = i.getCustomer();
            return new InvoiceResponse(i.getId(), i.getInvoiceNumber(),
                    c == null ? null : c.getId(), c == null ? "Walk-in customer" : c.getName(), c == null ? null : c.getPhone(),
                    i.getCreatedBy() == null ? null : i.getCreatedBy().getFullName(), i.getCreatedAt(),
                    i.getSubTotal(), i.getDiscount(), i.getGstAmount(), i.getTotalAmount(), i.getPaidAmount(),
                    i.getTotalAmount().subtract(i.getPaidAmount()), i.getPaymentMode(),
                    i.getItems().stream().map(it -> new InvoiceItemResponse(it.getProduct().getId(), it.getProductName(),
                            it.getQuantity(), it.getProduct().getUnit(), it.getUnitPrice(), it.getGstPercent(), it.getLineTotal(), it.getGstAmount())).toList());
        }
    }

    // ---------- Reports ----------
    public record DailySales(LocalDate date, BigDecimal total, long invoices) {}
    public record TopProduct(Long productId, String name, BigDecimal quantity, BigDecimal revenue) {}
    public record SalesReport(LocalDate from, LocalDate to, int invoiceCount, BigDecimal subTotal, BigDecimal discount,
                              BigDecimal gstAmount, BigDecimal totalSales, BigDecimal cost, BigDecimal profit,
                              List<DailySales> daily, List<TopProduct> topProducts) {}
    public record StockValuation(long totalProducts, BigDecimal totalUnits, BigDecimal costValue, BigDecimal retailValue) {}
    public record DashboardResponse(BigDecimal todaySales, long todayInvoices, BigDecimal monthSales, long totalProducts,
                                    long lowStockCount, BigDecimal pendingDues, List<DailySales> last7Days,
                                    List<TopProduct> topProducts) {}
}
