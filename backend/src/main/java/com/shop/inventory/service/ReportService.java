package com.shop.inventory.service;

import com.shop.inventory.dto.Dtos.*;
import com.shop.inventory.entity.Invoice;
import com.shop.inventory.entity.InvoiceItem;
import com.shop.inventory.entity.Product;
import com.shop.inventory.exception.BadRequestException;
import com.shop.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {
    private final InvoiceRepository invoices;
    private final InvoiceItemRepository invoiceItems;
    private final ProductRepository products;
    private final CustomerRepository customers;
    private final ExcelExportService excel;

    @Transactional(readOnly = true)
    public SalesReport sales(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) throw new BadRequestException("'To' date must not be before 'From' date");
        if (ChronoUnit.DAYS.between(from, to) > 366) throw new BadRequestException("Please select a range of up to one year");
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();

        BigDecimal sub = BigDecimal.ZERO, disc = BigDecimal.ZERO, gst = BigDecimal.ZERO, total = BigDecimal.ZERO, cost = BigDecimal.ZERO;
        Map<LocalDate, BigDecimal> dayTotals = new HashMap<>();
        Map<LocalDate, Long> dayCounts = new HashMap<>();
        List<Invoice> list = invoices.findInRange(start, end);
        for (Invoice i : list) {
            sub = sub.add(i.getSubTotal());
            disc = disc.add(i.getDiscount());
            gst = gst.add(i.getGstAmount());
            total = total.add(i.getTotalAmount());
            for (InvoiceItem it : i.getItems()) {
                cost = cost.add(it.getCostPrice().multiply(it.getQuantity()));
            }
            LocalDate d = i.getCreatedAt().toLocalDate();
            dayTotals.merge(d, i.getTotalAmount(), BigDecimal::add);
            dayCounts.merge(d, 1L, Long::sum);
        }
        List<DailySales> daily = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            daily.add(new DailySales(d, dayTotals.getOrDefault(d, BigDecimal.ZERO), dayCounts.getOrDefault(d, 0L)));
        }
        BigDecimal profit = sub.subtract(disc).subtract(cost); // revenue excluding GST minus cost of goods
        return new SalesReport(from, to, list.size(), sub, disc, gst, total, cost, profit, daily, topProducts(start, end, 10));
    }

    private List<TopProduct> topProducts(LocalDateTime start, LocalDateTime end, int limit) {
        return invoiceItems.topProducts(start, end, PageRequest.of(0, limit)).stream()
                .map(r -> new TopProduct((Long) r[0], (String) r[1], (BigDecimal) r[2], (BigDecimal) r[3]))
                .toList();
    }

    @Transactional(readOnly = true)
    public StockValuation stockValuation() {
        List<Product> list = products.findByActiveTrueOrderByName();
        BigDecimal units = BigDecimal.ZERO, cost = BigDecimal.ZERO, retail = BigDecimal.ZERO;
        for (Product p : list) {
            units = units.add(p.getStockQty());
            cost = cost.add(p.getCostPrice().multiply(p.getStockQty()));
            retail = retail.add(p.getPrice().multiply(p.getStockQty()));
        }
        return new StockValuation(list.size(), units, cost, retail);
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard() {
        LocalDate today = LocalDate.now();
        SalesReport week = sales(today.minusDays(6), today);
        DailySales t = week.daily().get(week.daily().size() - 1);
        BigDecimal month = sales(today.withDayOfMonth(1), today).totalSales();
        return new DashboardResponse(t.total(), t.invoices(), month, products.countByActiveTrue(),
                products.findLowStock().size(), customers.totalDues(), week.daily(), week.topProducts().stream().limit(5).toList());
    }

    @Transactional(readOnly = true)
    public byte[] salesExcel(LocalDate from, LocalDate to) {
        return excel.salesReport(sales(from, to));
    }

    @Transactional(readOnly = true)
    public byte[] stockExcel() {
        return excel.stockReport(products.findByActiveTrueOrderByName());
    }
}
