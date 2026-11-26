package com.shop.inventory.repository;

import com.shop.inventory.entity.InvoiceItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {
    @Query("""
            select ii.product.id, ii.productName, sum(ii.quantity), sum(ii.lineTotal)
            from InvoiceItem ii
            where ii.invoice.createdAt >= :start and ii.invoice.createdAt < :end
            group by ii.product.id, ii.productName
            order by sum(ii.quantity) desc
            """)
    List<Object[]> topProducts(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, Pageable pageable);
}
