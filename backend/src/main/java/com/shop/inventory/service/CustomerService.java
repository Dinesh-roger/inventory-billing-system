package com.shop.inventory.service;

import com.shop.inventory.dto.Dtos.CustomerRequest;
import com.shop.inventory.dto.Dtos.PayDueRequest;
import com.shop.inventory.entity.Customer;
import com.shop.inventory.entity.Payment;
import com.shop.inventory.exception.BadRequestException;
import com.shop.inventory.exception.NotFoundException;
import com.shop.inventory.repository.CustomerRepository;
import com.shop.inventory.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerService {
    private final CustomerRepository customers;
    private final PaymentRepository payments;

    public List<Customer> list(String q) {
        return customers.search(q == null ? "" : q.trim());
    }

    @Transactional
    public Customer create(CustomerRequest r) {
        Customer c = new Customer();
        apply(c, r);
        return customers.save(c);
    }

    @Transactional
    public Customer update(Long id, CustomerRequest r) {
        Customer c = find(id);
        apply(c, r);
        return c;
    }

    @Transactional
    public void delete(Long id) {
        find(id);
        customers.deleteById(id);
        customers.flush();
    }

    /** Customer pays back part or all of the credit (due) amount. */
    @Transactional
    public Customer payDue(Long id, PayDueRequest r) {
        Customer c = find(id);
        if (r.amount().compareTo(c.getDueAmount()) > 0) {
            throw new BadRequestException("Amount is more than the pending due of " + c.getDueAmount());
        }
        c.setDueAmount(c.getDueAmount().subtract(r.amount()));
        Payment pay = new Payment();
        pay.setCustomer(c);
        pay.setAmount(r.amount());
        pay.setMode(r.mode());
        pay.setPaidAt(LocalDateTime.now());
        pay.setNote("Due payment received");
        payments.save(pay);
        return c;
    }

    private Customer find(Long id) {
        return customers.findById(id).orElseThrow(() -> new NotFoundException("Customer not found"));
    }

    private void apply(Customer c, CustomerRequest r) {
        c.setName(r.name().trim());
        c.setPhone(r.phone());
        c.setAddress(r.address());
    }
}
