package com.equiflow.service;

import com.equiflow.dto.DashboardStatsDto;
import com.equiflow.entity.TransportPlan;
import com.equiflow.repository.DeliveryRepository;
import com.equiflow.repository.InvoiceRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.TransportRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DashboardStatsService {

    private final TransportRequestRepository requestRepository;
    private final TransportPlanRepository planRepository;
    private final InvoiceRepository invoiceRepository;
    private final DeliveryRepository deliveryRepository;

    public DashboardStatsService(TransportRequestRepository requestRepository,
                                 TransportPlanRepository planRepository,
                                 InvoiceRepository invoiceRepository,
                                 DeliveryRepository deliveryRepository) {
        this.requestRepository = requestRepository;
        this.planRepository = planRepository;
        this.invoiceRepository = invoiceRepository;
        this.deliveryRepository = deliveryRepository;
    }

    @Transactional
    public DashboardStatsDto.Response getStats() {
        List<TransportPlan> plans = planRepository.findAll();
        long inProgressCount = 0;
        long completedCount = 0;

        for (TransportPlan plan : plans) {
            String s = plan.getStatus() != null ? plan.getStatus().trim().toLowerCase() : "";
            boolean isDelivered = deliveryRepository.existsByPlanId(plan.getPlanId());

            if (isDelivered || s.contains("hoan thanh") || s.contains("hoàn thành") || s.contains("completed")) {
                completedCount++;
                if (!TransportPlanService.COMPLETED.equals(plan.getStatus()) && isDelivered) {
                    plan.setStatus(TransportPlanService.COMPLETED);
                    planRepository.save(plan);
                }
            } else if (s.contains("dang thuc hien") || s.contains("in_progress") || s.contains("in progress") || s.contains("san sang") || s.contains("ready")) {
                inProgressCount++;
            }
        }

        return new DashboardStatsDto.Response(
                requestRepository.count(),
                inProgressCount,
                completedCount,
                invoiceRepository.sumAmountByPaymentStatusGroupedByCurrency(InvoiceService.PAID).stream()
                        .map(row -> new DashboardStatsDto.RevenueByCurrency(row.getCurrency(), row.getAmount()))
                        .toList());
    }
}
