package com.equiflow.security;

import com.equiflow.controller.InvoiceController;
import com.equiflow.dto.InvoiceDto;
import com.equiflow.repository.UserRepository;
import com.equiflow.service.InvoiceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InvoiceController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class})
class InvoicePaymentAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private InvoiceService invoiceService;

    @Test
    void logisticsManagerCanConfirmManualPayment() throws Exception {
        UUID invoiceId = UUID.randomUUID();
        InvoiceDto.Response response = new InvoiceDto.Response(
                invoiceId, UUID.randomUUID(), new BigDecimal("125.00"), "VND", null,
                "PAID", "Tiền mặt", LocalDateTime.now(), LocalDateTime.now(), UUID.randomUUID(), "Test Customer");
        when(invoiceService.markPaid(invoiceId, new InvoiceDto.MarkPaidRequest("Tiền mặt")))
                .thenReturn(response);

        mockMvc.perform(put("/api/invoices/{id}/pay", invoiceId)
                        .with(user("manager").roles("LOGISTICS_MANAGER"))
                        .contentType("application/json")
                        .content("{\"paymentMethod\":\"Tiền mặt\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.paymentMethod").value("Tiền mặt"));

        verify(invoiceService).markPaid(invoiceId, new InvoiceDto.MarkPaidRequest("Tiền mặt"));
    }

    @Test
    void customerCannotConfirmPayment() throws Exception {
        mockMvc.perform(put("/api/invoices/{id}/pay", UUID.randomUUID())
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType("application/json")
                        .content("{\"paymentMethod\":\"Tiền mặt\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(invoiceService);
    }

    @Test
    void paymentMethodIsRequired() throws Exception {
        mockMvc.perform(put("/api/invoices/{id}/pay", UUID.randomUUID())
                        .with(user("manager").roles("LOGISTICS_MANAGER"))
                        .contentType("application/json")
                        .content("{\"paymentMethod\":\" \"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(invoiceService);
    }
}
