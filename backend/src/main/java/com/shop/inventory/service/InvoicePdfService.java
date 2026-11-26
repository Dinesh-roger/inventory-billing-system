package com.shop.inventory.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.shop.inventory.entity.Invoice;
import com.shop.inventory.entity.InvoiceItem;
import com.shop.inventory.exception.NotFoundException;
import com.shop.inventory.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class InvoicePdfService {
    private final InvoiceRepository invoices;

    @Value("${app.shop.name}") private String shopName;
    @Value("${app.shop.address}") private String shopAddress;
    @Value("${app.shop.phone}") private String shopPhone;
    @Value("${app.shop.gstin}") private String shopGstin;

    private static final Font TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
    private static final Font BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
    private static final Font NORMAL = FontFactory.getFont(FontFactory.HELVETICA, 10);
    private static final java.awt.Color HEADER_BG = new java.awt.Color(225, 232, 230);

    @Transactional(readOnly = true)
    public byte[] generate(Long id) {
        Invoice inv = invoices.findById(id).orElseThrow(() -> new NotFoundException("Invoice not found"));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            Document doc = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(doc, out);
            doc.open();

            Paragraph name = new Paragraph(shopName, TITLE);
            name.setAlignment(Element.ALIGN_CENTER);
            doc.add(name);
            Paragraph addr = new Paragraph(shopAddress + "\nPhone: " + shopPhone + "   GSTIN: " + shopGstin, NORMAL);
            addr.setAlignment(Element.ALIGN_CENTER);
            addr.setSpacingAfter(12);
            doc.add(addr);

            Paragraph title = new Paragraph("TAX INVOICE", BOLD);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(8);
            doc.add(title);

            PdfPTable meta = new PdfPTable(2);
            meta.setWidthPercentage(100);
            meta.getDefaultCell().setBorder(Rectangle.NO_BORDER);
            meta.addCell(new Phrase("Invoice No: " + inv.getInvoiceNumber() + "\nDate: "
                    + inv.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")), NORMAL));
            String cust = inv.getCustomer() == null ? "Walk-in customer"
                    : inv.getCustomer().getName() + (inv.getCustomer().getPhone() == null ? "" : "\nPhone: " + inv.getCustomer().getPhone());
            meta.addCell(new Phrase("Billed to: " + cust + "\nPayment: " + inv.getPaymentMode(), NORMAL));
            meta.setSpacingAfter(10);
            doc.add(meta);

            PdfPTable table = new PdfPTable(new float[]{3.6f, 1.6f, 1.8f, 1.2f, 2f});
            table.setWidthPercentage(100);
            for (String h : new String[]{"Item", "Qty", "Rate", "GST %", "Amount"}) {
                PdfPCell c = new PdfPCell(new Phrase(h, BOLD));
                c.setBackgroundColor(HEADER_BG);
                c.setPadding(5);
                if (!h.equals("Item")) c.setHorizontalAlignment(Element.ALIGN_RIGHT);
                table.addCell(c);
            }
            for (InvoiceItem it : inv.getItems()) {
                table.addCell(cell(it.getProductName(), false));
                table.addCell(cell(it.getQuantity().stripTrailingZeros().toPlainString() + " " + it.getProduct().getUnit(), true));
                table.addCell(cell(money(it.getUnitPrice()), true));
                table.addCell(cell(it.getGstPercent().stripTrailingZeros().toPlainString() + "%", true));
                table.addCell(cell(money(it.getLineTotal()), true));
            }
            doc.add(table);

            PdfPTable totals = new PdfPTable(new float[]{7f, 3f});
            totals.setWidthPercentage(100);
            totals.setSpacingBefore(10);
            addTotal(totals, "Sub total", money(inv.getSubTotal()), false);
            addTotal(totals, "Discount", "- " + money(inv.getDiscount()), false);
            addTotal(totals, "GST", money(inv.getGstAmount()), false);
            addTotal(totals, "Grand total", money(inv.getTotalAmount()), true);
            addTotal(totals, "Paid", money(inv.getPaidAmount()), false);
            BigDecimal due = inv.getTotalAmount().subtract(inv.getPaidAmount());
            if (due.signum() > 0) addTotal(totals, "Balance due", money(due), true);
            doc.add(totals);

            Paragraph thanks = new Paragraph("Thank you for shopping with us!", NORMAL);
            thanks.setAlignment(Element.ALIGN_CENTER);
            thanks.setSpacingBefore(24);
            doc.add(thanks);
            doc.close();
        } catch (Exception e) {
            throw new IllegalStateException("Could not generate invoice PDF", e);
        }
        return out.toByteArray();
    }

    private PdfPCell cell(String text, boolean right) {
        PdfPCell c = new PdfPCell(new Phrase(text, NORMAL));
        c.setPadding(5);
        if (right) c.setHorizontalAlignment(Element.ALIGN_RIGHT);
        return c;
    }

    private void addTotal(PdfPTable t, String label, String value, boolean bold) {
        PdfPCell l = new PdfPCell(new Phrase(label, bold ? BOLD : NORMAL));
        l.setBorder(Rectangle.NO_BORDER);
        l.setHorizontalAlignment(Element.ALIGN_RIGHT);
        PdfPCell v = new PdfPCell(new Phrase(value, bold ? BOLD : NORMAL));
        v.setBorder(Rectangle.NO_BORDER);
        v.setHorizontalAlignment(Element.ALIGN_RIGHT);
        t.addCell(l);
        t.addCell(v);
    }

    private String money(BigDecimal v) {
        return "Rs. " + (v == null ? "0.00" : v.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString());
    }
}
