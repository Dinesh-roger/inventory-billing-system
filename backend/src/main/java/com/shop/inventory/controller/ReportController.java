package com.shop.inventory.controller;

import com.shop.inventory.dto.Dtos.DashboardResponse;
import com.shop.inventory.dto.Dtos.SalesReport;
import com.shop.inventory.dto.Dtos.StockValuation;
import com.shop.inventory.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReportController {
    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    private final ReportService reports;

    /** Dashboard cards: visible to admin and staff. */
    @GetMapping("/dashboard")
    public DashboardResponse dashboard() { return reports.dashboard(); }

    @GetMapping("/reports/sales")
    @PreAuthorize("hasRole('ADMIN')")
    public SalesReport sales(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reports.sales(from, to);
    }

    @GetMapping("/reports/stock-valuation")
    @PreAuthorize("hasRole('ADMIN')")
    public StockValuation stockValuation() { return reports.stockValuation(); }

    @GetMapping("/reports/sales/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportSales(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return file(reports.salesExcel(from, to), "sales-report-" + from + "-to-" + to + ".xlsx");
    }

    @GetMapping("/reports/stock/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportStock() {
        return file(reports.stockExcel(), "stock-report-" + LocalDate.now() + ".xlsx");
    }

    private ResponseEntity<byte[]> file(byte[] bytes, String name) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + name)
                .contentType(XLSX)
                .body(bytes);
    }
}
