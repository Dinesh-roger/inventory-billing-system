package com.shop.inventory.repository;

import com.shop.inventory.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    /** LEFT JOIN: bills without a customer (walk-in) must also appear in history. */
    @Query("""
            select i from Invoice i left join i.customer c
            where i.createdAt >= :start and i.createdAt < :end
              and (lower(i.invoiceNumber) like lower(concat('%', :q, '%'))
                   or lower(coalesce(c.name, 'walk-in customer')) like lower(concat('%', :q, '%')))
            """)
    Page<Invoice> search(@Param("q") String q, @Param("start") LocalDateTime start,
                         @Param("end") LocalDateTime end, Pageable pageable);

    @Query("select i from Invoice i where i.createdAt >= :start and i.createdAt < :end order by i.createdAt asc")
    List<Invoice> findInRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
