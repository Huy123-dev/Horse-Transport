package com.equiflow.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class CrewAssignmentRepositoryQueryTest {

    @Autowired
    private DeliveryRepository deliveryRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private TrackingLogRepository trackingLogRepository;

    @Autowired
    private HealthLogRepository healthLogRepository;

    @Test
    void testCountCrewAssignmentsQueriesExecuteSuccessfully() {
        UUID planId = UUID.fromString("11a00000-0000-0000-0000-000000000001");
        UUID driverId = UUID.fromString("c3000000-0000-0000-0000-000000000003");
        UUID escortId = UUID.fromString("c3000000-0000-0000-0000-000000000004");

        // 1. DeliveryRepository.countCrewAssignments
        long deliveryCount = deliveryRepository.countCrewAssignments(planId, driverId);
        assertTrue(deliveryCount >= 0, "DeliveryRepository count should be >= 0");

        // 2. IncidentRepository.countCrewAssignments
        long incidentCount = incidentRepository.countCrewAssignments(planId, driverId);
        assertTrue(incidentCount >= 0, "IncidentRepository count should be >= 0");

        // 3. TrackingLogRepository.countCrewAssignments
        long trackingCount = trackingLogRepository.countCrewAssignments(planId, driverId);
        assertTrue(trackingCount >= 0, "TrackingLogRepository count should be >= 0");

        // 4. HealthLogRepository.countCrewAssignments
        long healthCount = healthLogRepository.countCrewAssignments(planId, escortId);
        assertTrue(healthCount >= 0, "HealthLogRepository count should be >= 0");

        System.out.println("✅ All 4 countCrewAssignments queries executed successfully on SQL Server!");
        System.out.println("Delivery countCrewAssignments: " + deliveryCount);
        System.out.println("Incident countCrewAssignments: " + incidentCount);
        System.out.println("TrackingLog countCrewAssignments: " + trackingCount);
        System.out.println("HealthLog countCrewAssignments: " + healthCount);
    }
}
