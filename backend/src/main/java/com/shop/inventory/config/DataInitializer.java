package com.shop.inventory.config;

import com.shop.inventory.dto.Dtos.ProductRequest;
import com.shop.inventory.entity.AppUser;
import com.shop.inventory.entity.Category;
import com.shop.inventory.entity.Role;
import com.shop.inventory.entity.Supplier;
import com.shop.inventory.repository.CategoryRepository;
import com.shop.inventory.repository.ProductRepository;
import com.shop.inventory.repository.SupplierRepository;
import com.shop.inventory.repository.UserRepository;
import com.shop.inventory.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/** Creates default logins and a few sample products the first time the app starts on an empty database. */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    private final UserRepository users;
    private final CategoryRepository categories;
    private final SupplierRepository suppliers;
    private final ProductRepository products;
    private final ProductService productService;
    private final PasswordEncoder encoder;

    @Value("${app.seed-sample-data:true}") private boolean seedSample;
    @Value("${app.admin.password:admin123}") private String adminPassword;

    @Override
    public void run(String... args) {
        if (users.count() == 0) {
            users.save(user("admin", adminPassword, "Shop Owner", Role.ADMIN));
            log.info("Created admin user 'admin'. Change the password after the first login if you did not set ADMIN_PASSWORD.");
            if (seedSample) {
                users.save(user("staff", "staff123", "Cashier", Role.STAFF));
                log.info("Created demo staff user staff/staff123.");
            }
        }
        if (seedSample && products.count() == 0) {
            Category grocery = category("Grocery");
            Category beverages = category("Beverages");
            Category snacks = category("Snacks");
            Category stationery = category("Stationery");

            Supplier s = new Supplier();
            s.setName("Sri Lakshmi Wholesalers");
            s.setPhone("9876500000");
            s.setAddress("Koyambedu Market, Chennai");
            suppliers.save(s);

            sample("Sona Masoori Rice 5kg", "GRO-RICE-5", "8901000000011", grocery, "320", "275", "5", 40, 10);
            sample("Toor Dal 1kg", "GRO-DAL-1", "8901000000028", grocery, "165", "140", "5", 25, 10);
            sample("Sunflower Oil 1L", "GRO-OIL-1", "8901000000035", grocery, "145", "128", "5", 8, 12);
            sample("Mineral Water 1L", "BEV-WAT-1", "8901000000042", beverages, "20", "13", "18", 60, 20);
            sample("Cola 750ml", "BEV-COLA-750", "8901000000059", beverages, "40", "32", "28", 30, 12);
            sample("Potato Chips 52g", "SNK-CHIP-52", "8901000000066", snacks, "20", "15", "12", 3, 10);
            sample("Notebook 200 pages", "STA-NB-200", "8901000000073", stationery, "55", "42", "12", 35, 10);
            sample("Ball Pen (blue)", "STA-PEN-BL", "8901000000080", stationery, "10", "6", "12", 100, 25);
            sample("Sugar (loose)", "GRO-SUG-KG", "8901000000097", grocery, "46", "41", "5", 50, 10, "kg");
            sample("Rice (loose)", "GRO-RICE-KG", "8901000000104", grocery, "58", "50", "5", 100, 20, "kg");
            log.info("Added sample categories, supplier and products.");
        }
    }

    private AppUser user(String username, String password, String fullName, Role role) {
        AppUser u = new AppUser();
        u.setUsername(username);
        u.setPassword(encoder.encode(password));
        u.setFullName(fullName);
        u.setRole(role);
        u.setActive(true);
        return u;
    }

    private Category category(String name) {
        Category c = new Category();
        c.setName(name);
        return categories.save(c);
    }

    private void sample(String name, String sku, String barcode, Category c, String price, String cost, String gst, int stock, int reorder) {
        sample(name, sku, barcode, c, price, cost, gst, stock, reorder, "pcs");
    }

    private void sample(String name, String sku, String barcode, Category c, String price, String cost, String gst, int stock, int reorder, String unit) {
        productService.create(new ProductRequest(name, sku, barcode, c.getId(), new BigDecimal(price), new BigDecimal(cost),
                new BigDecimal(gst), new BigDecimal(stock), new BigDecimal(reorder), unit), "system");
    }
}
