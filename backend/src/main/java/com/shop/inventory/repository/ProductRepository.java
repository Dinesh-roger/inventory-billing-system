package com.shop.inventory.repository;

import com.shop.inventory.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    boolean existsBySkuIgnoreCase(String sku);
    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);
    long countByActiveTrue();
    List<Product> findByActiveTrueOrderByName();

    @Query("""
            select p from Product p
            where p.active = true
              and (lower(p.name) like lower(concat('%', :q, '%'))
                   or lower(p.sku) like lower(concat('%', :q, '%'))
                   or p.barcode = :q)
              and (:categoryId is null or p.category.id = :categoryId)
            """)
    Page<Product> search(@Param("q") String q, @Param("categoryId") Long categoryId, Pageable pageable);

    @Query("select p from Product p where p.active = true and p.stockQty <= p.reorderLevel order by p.stockQty asc, p.name asc")
    List<Product> findLowStock();
}
