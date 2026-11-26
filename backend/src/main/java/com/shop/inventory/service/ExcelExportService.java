package com.shop.inventory.service;

import com.shop.inventory.dto.Dtos.DailySales;
import com.shop.inventory.dto.Dtos.SalesReport;
import com.shop.inventory.dto.Dtos.TopProduct;
import com.shop.inventory.entity.Product;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;

@Service
public class ExcelExportService {

    public byte[] salesReport(SalesReport r) {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet summary = wb.createSheet("Summary");
            int i = 0;
            row(summary, i++, "Sales report", r.from() + " to " + r.to());
            row(summary, i++, "Invoices", r.invoiceCount());
            row(summary, i++, "Sub total", r.subTotal());
            row(summary, i++, "Discount", r.discount());
            row(summary, i++, "GST collected", r.gstAmount());
            row(summary, i++, "Total sales", r.totalSales());
            row(summary, i++, "Cost of goods", r.cost());
            row(summary, i++, "Profit", r.profit());

            Sheet daily = wb.createSheet("Daily sales");
            row(daily, 0, "Date", "Invoices", "Total");
            int d = 1;
            for (DailySales s : r.daily()) row(daily, d++, s.date().toString(), s.invoices(), s.total());

            Sheet top = wb.createSheet("Top products");
            row(top, 0, "Product", "Quantity sold", "Revenue");
            int t = 1;
            for (TopProduct p : r.topProducts()) row(top, t++, p.name(), p.quantity(), p.revenue());

            for (Sheet s : new Sheet[]{summary, daily, top}) {
                for (int c = 0; c < 3; c++) s.autoSizeColumn(c);
            }
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Could not create Excel file", e);
        }
    }

    public byte[] stockReport(List<Product> products) {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet s = wb.createSheet("Stock");
            row(s, 0, "SKU", "Product", "Category", "Stock", "Reorder level", "Cost price", "Selling price", "Stock value (cost)");
            int i = 1;
            for (Product p : products) {
                row(s, i++, p.getSku(), p.getName(), p.getCategory() == null ? "" : p.getCategory().getName(),
                        p.getStockQty(), p.getReorderLevel(), p.getCostPrice(), p.getPrice(),
                        p.getCostPrice().multiply(p.getStockQty()));
            }
            for (int c = 0; c < 8; c++) s.autoSizeColumn(c);
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Could not create Excel file", e);
        }
    }

    private void row(Sheet sheet, int index, Object... values) {
        Row row = sheet.createRow(index);
        for (int c = 0; c < values.length; c++) {
            Object v = values[c];
            if (v instanceof Number n) row.createCell(c).setCellValue(n.doubleValue());
            else row.createCell(c).setCellValue(v == null ? "" : String.valueOf(v));
        }
    }
}
