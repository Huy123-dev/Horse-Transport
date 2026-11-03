package com.equiflow.config;

import com.equiflow.entity.Horse;
import com.equiflow.entity.Location;
import com.equiflow.entity.TransportAssignment;
import com.equiflow.entity.TransportPlan;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.User;
import com.equiflow.repository.HorseRepository;
import com.equiflow.repository.LocationRepository;
import com.equiflow.repository.RoleRepository;
import com.equiflow.repository.TransportAssignmentRepository;
import com.equiflow.repository.TransportPlanRepository;
import com.equiflow.repository.TransportRequestRepository;
import com.equiflow.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Creates isolated E2E fixtures only when explicitly enabled.
 *
 * Enable only with the "e2e" Spring profile, app.e2e-seed.enabled=true,
 * app.e2e-seed.confirm-target=LOCAL-TEST-ONLY, and a supplied test password.
 * Existing test accounts are not modified, including their passwords.
 */
@Component
@Profile("e2e")
@ConditionalOnProperty(name = "app.e2e-seed.enabled", havingValue = "true")
public class DatabaseSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseSeeder.class);

    private static final String CUSTOMER_EMAIL = "customer_test@example.com";
    private static final String MANAGER_EMAIL = "logistics_test@example.com";
    private static final String DRIVER_EMAIL = "driver_test@example.com";
    private static final String CUSTOMER_ROLE = "CUSTOMER";
    private static final String MANAGER_ROLE = "LOGISTICS_MANAGER";
    private static final String DRIVER_ROLE = "DRIVER_ESCORT";
    private static final String REQUEST_MARKER = "[Equideli E2E fixture]";
    private static final String ROUTE_MARKER = "{\"fixture\":\"Equideli E2E seed\"}";
    private static final String APPROVED = "Da phe duyet";
    private static final String IN_PROGRESS = "Dang thuc hien";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final HorseRepository horseRepository;
    private final LocationRepository locationRepository;
    private final TransportRequestRepository requestRepository;
    private final TransportPlanRepository planRepository;
    private final TransportAssignmentRepository assignmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate transactionTemplate;
    private final String testPassword;
    private final String targetConfirmation;

    public DatabaseSeeder(UserRepository userRepository,
                          RoleRepository roleRepository,
                          HorseRepository horseRepository,
                          LocationRepository locationRepository,
                          TransportRequestRepository requestRepository,
                          TransportPlanRepository planRepository,
                          TransportAssignmentRepository assignmentRepository,
                          PasswordEncoder passwordEncoder,
                          PlatformTransactionManager transactionManager,
                          @Value("${app.e2e-seed.password:}") String testPassword,
                          @Value("${app.e2e-seed.confirm-target:}") String targetConfirmation) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.horseRepository = horseRepository;
        this.locationRepository = locationRepository;
        this.requestRepository = requestRepository;
        this.planRepository = planRepository;
        this.assignmentRepository = assignmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.testPassword = testPassword;
        this.targetConfirmation = targetConfirmation;
    }

    @Override
    public void run(String... args) {
        if (testPassword == null || testPassword.isBlank()) {
            throw new IllegalStateException(
                    "Set app.e2e-seed.password to a non-empty test password before enabling the E2E seeder.");
        }
        if (!"LOCAL-TEST-ONLY".equals(targetConfirmation)) {
            throw new IllegalStateException(
                    "Confirm the datasource is an isolated test database with app.e2e-seed.confirm-target=LOCAL-TEST-ONLY.");
        }

        transactionTemplate.executeWithoutResult(status -> seed());
        log.info("Equideli E2E fixtures are ready. Existing test accounts were left unchanged.");
    }

    private void seed() {
        requireRole(CUSTOMER_ROLE);
        requireRole(MANAGER_ROLE);
        requireRole(DRIVER_ROLE);

        User customer = ensureUser(CUSTOMER_EMAIL, CUSTOMER_ROLE, "E2E Test Customer");
        User manager = ensureUser(MANAGER_EMAIL, MANAGER_ROLE, "E2E Test Logistics Manager");
        User driver = ensureUser(DRIVER_EMAIL, DRIVER_ROLE, "E2E Test Driver");

        Location origin = ensureLocation(
                "Equideli E2E Test Origin", "ORIGIN", "JPN", "35.676200", "139.650300");
        Location destination = ensureLocation(
                "Equideli E2E Test Destination", "DESTINATION", "JPN", "34.693700", "135.502300");

        Horse horseOne = ensureHorse(
                "EQE2E-MICROCHIP-001", "E2E Test Horse One", "Duc", customer);
        Horse horseTwo = ensureHorse(
                "EQE2E-MICROCHIP-002", "E2E Test Horse Two", "Cai", customer);

        TransportRequest request = ensureApprovedRequest(
                customer, manager, origin, destination, horseOne, horseTwo);
        TransportPlan plan = ensureInProgressPlan(request);
        ensureDriverAssignment(plan, driver);
    }

    private void requireRole(String roleId) {
        if (!roleRepository.existsById(roleId)) {
            throw new IllegalStateException(
                    "Required role '" + roleId + "' is missing from dbo.roles; seed was rolled back.");
        }
    }

    private User ensureUser(String email, String roleId, String name) {
        return userRepository.findByEmail(email).map(existing -> {
            if (!roleId.equals(existing.getRoleId())) {
                throw new IllegalStateException(
                        "Existing test account " + email + " has role " + existing.getRoleId()
                                + "; expected " + roleId + ". No account was modified.");
            }
            return existing;
        }).orElseGet(() -> {
            User user = new User();
            user.setEmail(email);
            user.setPasswordHash(passwordEncoder.encode(testPassword));
            user.setRoleId(roleId);
            user.setName(name);
            return userRepository.saveAndFlush(user);
        });
    }

    private Location ensureLocation(String name, String type, String countryCode,
                                    String latitude, String longitude) {
        List<Location> matches = locationRepository.findAllByOrderByNameAsc().stream()
                .filter(location -> name.equals(location.getName()))
                .toList();
        if (matches.size() > 1) {
            throw new IllegalStateException("Multiple locations use E2E fixture name: " + name);
        }
        if (!matches.isEmpty()) {
            Location existing = matches.get(0);
            if (!type.equals(existing.getType()) || !countryCode.equals(existing.getCountryCode())) {
                throw new IllegalStateException("Existing E2E location has incompatible metadata: " + name);
            }
            return existing;
        }

        Location location = new Location();
        location.setName(name);
        location.setType(type);
        location.setLatitude(new BigDecimal(latitude));
        location.setLongitude(new BigDecimal(longitude));
        location.setCountryCode(countryCode);
        return locationRepository.saveAndFlush(location);
    }

    private Horse ensureHorse(String microchipId, String name, String gender, User owner) {
        List<Horse> matches = horseRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(horse -> microchipId.equals(horse.getMicrochipId()))
                .toList();
        if (matches.size() > 1) {
            throw new IllegalStateException("Multiple horses use E2E microchip: " + microchipId);
        }
        if (!matches.isEmpty()) {
            Horse existing = matches.get(0);
            if (!owner.getUserId().equals(existing.getOwnerUserId())) {
                throw new IllegalStateException("E2E horse is not owned by the seeded customer: " + microchipId);
            }
            return existing;
        }

        Horse horse = new Horse();
        horse.setMicrochipId(microchipId);
        horse.setName(name);
        horse.setGender(gender);
        horse.setOwnerUserId(owner.getUserId());
        horse.setTemperament("Calm");
        return horseRepository.saveAndFlush(horse);
    }

    private TransportRequest ensureApprovedRequest(User customer, User manager, Location origin,
                                                    Location destination, Horse horseOne, Horse horseTwo) {
        List<TransportRequest> matches = requestRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(request -> REQUEST_MARKER.equals(request.getSpecialRequirements()))
                .toList();
        if (matches.size() > 1) {
            throw new IllegalStateException("Multiple transport requests use the E2E fixture marker.");
        }
        if (!matches.isEmpty()) {
            TransportRequest existing = matches.get(0);
            Set<UUID> expectedHorseIds = Set.of(horseOne.getHorseId(), horseTwo.getHorseId());
            if (!customer.getUserId().equals(existing.getCustomerId())
                    || !origin.getLocationId().equals(existing.getOriginLocationId())
                    || !destination.getLocationId().equals(existing.getDestinationLocationId())
                    || !APPROVED.equals(existing.getStatus())
                    || !manager.getUserId().equals(existing.getApprovedBy())
                    || !expectedHorseIds.equals(existing.getHorseIds())) {
                throw new IllegalStateException(
                        "Existing E2E request no longer matches the fixture; it was not modified.");
            }
            return existing;
        }

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        TransportRequest request = new TransportRequest();
        request.setCustomerId(customer.getUserId());
        request.setOriginLocationId(origin.getLocationId());
        request.setDestinationLocationId(destination.getLocationId());
        request.setScheduledDepartureDate(today);
        request.setScheduledArrivalDate(today.plusDays(1));
        request.setSpecialRequirements(REQUEST_MARKER);
        request.setStatus(APPROVED);
        request.setEstimatedAmount(new BigDecimal("1200.00"));
        request.setCurrency("USD");
        request.setApprovedBy(manager.getUserId());
        request.setApprovedAt(LocalDateTime.now(ZoneOffset.UTC));
        request.setHorseIds(new LinkedHashSet<>(Set.of(horseOne.getHorseId(), horseTwo.getHorseId())));
        return requestRepository.saveAndFlush(request);
    }

    private TransportPlan ensureInProgressPlan(TransportRequest request) {
        List<TransportPlan> matches = planRepository
                .findByRequestIdOrderByDepartureTimeDesc(request.getRequestId()).stream()
                .filter(plan -> ROUTE_MARKER.equals(plan.getRouteDetails()))
                .toList();
        if (matches.size() > 1) {
            throw new IllegalStateException("Multiple transport plans use the E2E fixture marker.");
        }
        if (!matches.isEmpty()) {
            return matches.get(0);
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        TransportPlan plan = new TransportPlan();
        plan.setRequestId(request.getRequestId());
        plan.setRouteDetails(ROUTE_MARKER);
        plan.setDepartureTime(now.minusMinutes(30));
        plan.setArrivalTime(now.plusHours(6));
        plan.setStatus(IN_PROGRESS);
        return planRepository.saveAndFlush(plan);
    }

    private void ensureDriverAssignment(TransportPlan plan, User driver) {
        List<TransportAssignment> assignments = assignmentRepository
                .findByPlanIdOrderByAssignedAtAsc(plan.getPlanId());
        List<TransportAssignment> driverAssignments = assignments.stream()
                .filter(assignment -> driver.getUserId().equals(assignment.getDriverUserId()))
                .toList();
        if (!driverAssignments.isEmpty()) {
            return;
        }
        if (!assignments.isEmpty()) {
            throw new IllegalStateException(
                    "E2E plan already has another assignment; it was not changed or duplicated.");
        }

        TransportAssignment assignment = new TransportAssignment();
        assignment.setPlanId(plan.getPlanId());
        assignment.setDriverUserId(driver.getUserId());
        assignmentRepository.saveAndFlush(assignment);
    }
}
