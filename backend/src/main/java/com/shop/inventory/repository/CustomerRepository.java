package com.shop.inventory.repository;

import com.shop.inventory.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    @Query("select c from Customer c where lower(c.name) like lower(concat('%', :q, '%')) or c.phone like concat('%', :q, '%') order by c.name")
    List<Customer> search(@Param("q") String q);

    @Query("select coalesce(sum(c.dueAmount), 0) from Customer c")
    BigDecimal totalDues();
}
