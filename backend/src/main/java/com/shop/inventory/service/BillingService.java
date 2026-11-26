package com.shop.inventory.service;

import com.shop.inventory.dto.Dtos.InvoiceRequest;
import com.shop.inventory.dto.Dtos.InvoiceResponse;
import com.shop.inventory.entity.*;
import com.shop.inventory.exception.BadRequestException;
import com.shop.inventory.exception.NotFoundException;
import com.shop.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingService {
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final InvoiceRepository invoices;
    private final ProductRepository products;
    private final CustomerRepository customers;
    private final UserRepository users;
    private final PaymentRepository payments;
    private final StockService stock;

    /**
     * One transaction: invoice, items, stock deduction, stock history, payment and customer due are saved together.
     * If anything fails (e.g. not enough stock) everything rolls back.
     * Product has @Version, so a concurrent sale of the same product fails with a 409 instead of corrupting stock.
     */
    @Transactional
    public InvoiceResponse create(InvoiceRequest req, String username) {
        AppUser cashier = users.findByUsername(username).orElseThrow(() -> new NotFoundException("User not found"));
        Customer customer = req.customerId() == null ? null
                : customers.findById(req.customerId()).orElseThrow(() -> new NotFoundException("Customer not found"));

        Invoice inv = new Invoice();
        inv.setInvoiceNumber("TMP-" + UUID.randomUUID());
        inv.setCreatedBy(cashier);
        inv.setCustomer(customer);
        inv.setCreatedAt(LocalDateTime.now());
        inv.setPaymentMode(req.paymentMode());
        inv = invoices.save(inv);
        inv.setInvoiceNumber(String.format("INV-%d-%06d", inv.getCreatedAt().getYear(), inv.getId()));

        BigDecimal subTotal = BigDecimal.ZERO;
        BigDecimal gstRaw = BigDecimal.ZERO;

        for (InvoiceRequest.Line line : req.items()) {
            Product p = products.findById(line.productId()).filter(Product::isActive)
                    .orElseThrow(() -> new NotFoundException("Product not found: " + line.productId()));
            BigDecimal qty = line.quantity().setScale(3, RoundingMode.HALF_UP);
            if (qty.signum() <= 0) throw new BadRequestException("Quantity must be more than 0 for " + p.getName());
            boolean countUnit = List.of("pcs", "nos", "pack", "dozen").contains(p.getUnit().toLowerCase());
            if (countUnit && qty.stripTrailingZeros().scale() > 0) {
                throw new BadRequestException(p.getName() + " is sold in whole numbers only");
            }
            if (p.getStockQty().compareTo(qty) < 0) {
                throw new BadRequestException("Not enough stock for " + p.getName() + " (available "
                        + p.getStockQty().stripTrailingZeros().toPlainString() + " " + p.getUnit() + ")");
            }
            BigDecimal lineTotal = p.getPrice().multiply(qty).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineGst = lineTotal.multiply(p.getGstPercent()).divide(HUNDRED, 4, RoundingMode.HALF_UP);

            InvoiceItem item = new InvoiceItem();
            item.setInvoice(inv);
            item.setProduct(p);
            item.setProductName(p.getName());
            item.setQuantity(qty);
            item.setUnitPrice(p.getPrice());
            item.setCostPrice(p.getCostPrice());
            item.setGstPercent(p.getGstPercent());
            item.setLineTotal(lineTotal);
            item.setGstAmount(lineGst.setScale(2, RoundingMode.HALF_UP));
            inv.getItems().add(item);

            subTotal = subTotal.add(lineTotal);
            gstRaw = gstRaw.add(lineGst);
            stock.record(p, MovementType.OUT, qty.negate(), "Sale", inv.getInvoiceNumber(), username);
        }

        BigDecimal discount = req.discount() == null ? BigDecimal.ZERO : req.discount().setScale(2, RoundingMode.HALF_UP);
        if (discount.compareTo(subTotal) > 0) throw new BadRequestException("Discount cannot be more than the bill amount");
        BigDecimal taxable = subTotal.subtract(discount);
        // GST is reduced in the same proportion as the discount
        BigDecimal gst = subTotal.signum() == 0 ? BigDecimal.ZERO
                : gstRaw.multiply(taxable).divide(subTotal, 2, RoundingMode.HALF_UP);
        BigDecimal total = taxable.add(gst).setScale(2, RoundingMode.HALF_UP);

        BigDecimal paid;
        if (req.paymentMode() == PaymentMode.CREDIT) {
            if (customer == null) throw new BadRequestException("Select a customer for a credit sale");
            paid = req.paidAmount() == null ? BigDecimal.ZERO : req.paidAmount().min(total);
        } else {
            paid = total;
        }
        BigDecimal due = total.subtract(paid);
        if (due.signum() > 0) customer.setDueAmount(customer.getDueAmount().add(due));

        inv.setSubTotal(subTotal);
        inv.setDiscount(discount);
        inv.setGstAmount(gst);
        inv.setTotalAmount(total);
        inv.setPaidAmount(paid);

        if (paid.signum() > 0) {
            Payment pay = new Payment();
            pay.setInvoice(inv);
            pay.setCustomer(customer);
            pay.setAmount(paid);
            pay.setMode(req.paymentMode() == PaymentMode.CREDIT ? PaymentMode.CASH : req.paymentMode());
            pay.setPaidAt(LocalDateTime.now());
            payments.save(pay);
        }
        return InvoiceResponse.from(inv);
    }

    /** Bill history: newest first, optional text search and date range (both dates inclusive). */
    @Transactional(readOnly = true)
    public Page<InvoiceResponse> list(String q, LocalDate from, LocalDate to, int page, int size) {
        LocalDateTime start = (from == null ? LocalDate.of(2000, 1, 1) : from).atStartOfDay();
        LocalDateTime end = (to == null ? LocalDate.of(2100, 1, 1) : to).plusDays(1).atStartOfDay();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        return invoices.search(q == null ? "" : q.trim(), start, end, pageable).map(InvoiceResponse::from);
    }

    @Transactional(readOnly = true)
    public InvoiceResponse get(Long id) {
        return InvoiceResponse.from(invoices.findById(id).orElseThrow(() -> new NotFoundException("Invoice not found")));
    }
}
