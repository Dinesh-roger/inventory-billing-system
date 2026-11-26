package com.shop.inventory.service;

import com.shop.inventory.entity.Product;
import com.shop.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/** Runs on the cron in application.properties and emails the owner a list of items at or below reorder level. */
@Component
@RequiredArgsConstructor
@Slf4j
public class LowStockAlertJob {
    private final ProductRepository products;
    private final ObjectProvider<JavaMailSender> mailSender;

    @Value("${app.low-stock.enabled:false}") private boolean enabled;
    @Value("${app.low-stock.to:}") private String to;
    @Value("${spring.mail.username:no-reply@shop.local}") private String from;

    @Scheduled(cron = "${app.low-stock.cron}")
    public void run() {
        List<Product> low = products.findLowStock();
        if (low.isEmpty()) return;
        log.info("Low stock check: {} item(s) need reordering", low.size());
        JavaMailSender sender = mailSender.getIfAvailable();
        if (!enabled || sender == null || to.isBlank()) return;

        StringBuilder body = new StringBuilder("These items are at or below their reorder level:\n\n");
        for (Product p : low) {
            body.append("- ").append(p.getName()).append(" (").append(p.getSku()).append("): ")
                .append(p.getStockQty()).append(" left, reorder level ").append(p.getReorderLevel()).append('\n');
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to.split("\\s*,\\s*"));
            msg.setSubject("Low stock alert: " + low.size() + " item(s)");
            msg.setText(body.toString());
            sender.send(msg);
        } catch (Exception e) {
            log.error("Could not send low stock email: {}", e.getMessage());
        }
    }
}
