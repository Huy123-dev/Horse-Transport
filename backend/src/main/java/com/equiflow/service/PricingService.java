package com.equiflow.service;

import com.equiflow.dto.PricingDto;
import com.equiflow.dto.StallPricingDto;
import com.equiflow.entity.PricingItemConfig;
import com.equiflow.entity.StallPricingConfig;
import com.equiflow.entity.TransportRequest;
import com.equiflow.entity.TransportRequestPricingSelection;
import com.equiflow.entity.TransportRequestQuote;
import com.equiflow.entity.TransportRequestQuoteLine;
import com.equiflow.entity.TransportRequestStall;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.PricingItemConfigRepository;
import com.equiflow.repository.TransportRequestPricingSelectionRepository;
import com.equiflow.repository.TransportRequestQuoteLineRepository;
import com.equiflow.repository.TransportRequestQuoteRepository;
import com.equiflow.repository.TransportRequestRepository;
import com.equiflow.repository.TransportRequestStallRepository;
import com.equiflow.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PricingService {

    private static final String USD = "USD";
    private static final String PENDING = TransportRequestService.PENDING;
    private static final String MANAGER_APPROVED = TransportRequestService.MANAGER_APPROVED;
    private static final String APPROVED = TransportRequestService.APPROVED;
    private static final List<ItemDefinition> DEFINITIONS = List.of(
            new ItemDefinition("BASIC_TRANSPORT", "Basic Transport", "PACKAGE"),
            new ItemDefinition("STANDARD_TRANSPORT", "Standard Transport", "PACKAGE"),
            new ItemDefinition("PREMIUM_TRANSPORT", "Premium Transport", "PACKAGE"),
            new ItemDefinition("VETERINARY_SUPPORT", "Veterinary Support", "SERVICE"),
            new ItemDefinition("CUSTOMS_DOCUMENTATION", "Customs & Documentation", "SERVICE"),
            new ItemDefinition("DEDICATED_STALL", "Dedicated Stall", "SERVICE"),
            new ItemDefinition("SHARED_STALL", "Shared Stall", "SERVICE"),
            new ItemDefinition("INSURANCE", "Insurance", "SERVICE"),
            new ItemDefinition("GROOM_ESCORT", "Groom / Escort", "SERVICE"),
            new ItemDefinition("EMERGENCY_TRANSPORT", "Emergency Transport", "SERVICE"),
            new ItemDefinition("ADDITIONAL_HANDLING", "Additional Handling", "SERVICE"));
    private static final Map<String, ItemDefinition> ITEMS = DEFINITIONS.stream()
            .collect(Collectors.toUnmodifiableMap(ItemDefinition::code, item -> item));
    private static final List<String> PACKAGE_CODES = DEFINITIONS.stream()
            .filter(item -> "PACKAGE".equals(item.category())).map(ItemDefinition::code).toList();
    private static final List<String> SERVICE_CODES = DEFINITIONS.stream()
            .filter(item -> "SERVICE".equals(item.category())).map(ItemDefinition::code).toList();

    private final PricingItemConfigRepository configRepository;
    private final TransportRequestPricingSelectionRepository selectionRepository;
    private final TransportRequestQuoteRepository quoteRepository;
    private final TransportRequestQuoteLineRepository quoteLineRepository;
    private final TransportRequestRepository requestRepository;
    private final RequestAccessService access;
    private final UserRepository userRepository;
    private final StallPricingService stallPricingService;
    private final TransportRequestStallRepository stallRepository;

    public PricingService(PricingItemConfigRepository configRepository,
                          TransportRequestPricingSelectionRepository selectionRepository,
                          TransportRequestQuoteRepository quoteRepository,
                          TransportRequestQuoteLineRepository quoteLineRepository,
                          TransportRequestRepository requestRepository,
                          RequestAccessService access,
                          UserRepository userRepository,
                          StallPricingService stallPricingService,
                          TransportRequestStallRepository stallRepository) {
        this.configRepository = configRepository;
        this.selectionRepository = selectionRepository;
        this.quoteRepository = quoteRepository;
        this.quoteLineRepository = quoteLineRepository;
        this.requestRepository = requestRepository;
        this.access = access;
        this.userRepository = userRepository;
        this.stallPricingService = stallPricingService;
        this.stallRepository = stallRepository;
    }

    @Transactional(readOnly = true)
    public List<PricingDto.CatalogItem> catalog() {
        Map<String, PricingItemConfig> configs = loadConfigs();
        return DEFINITIONS.stream().map(item -> toCatalogItem(item, configs.get(item.code()))).toList();
    }

    @Transactional
    public PricingDto.CatalogItem updateItem(String code, PricingDto.UpdateItemRequest request, UUID managerId) {
        ItemDefinition definition = definition(code);
        Set<String> inclusions = normalizeCodes(request.includedServiceCodes());
        if (request.includedServiceCodes() != null
                && inclusions.size() != request.includedServiceCodes().size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Danh sách dịch vụ bao gồm không được trùng");
        }
        if (!"PACKAGE".equals(definition.category()) && !inclusions.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ gói vận chuyển mới có thể bao gồm dịch vụ");
        }
        if (inclusions.stream().anyMatch(serviceCode -> !SERVICE_CODES.contains(serviceCode))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Danh sách dịch vụ bao gồm không hợp lệ");
        }
        if (request.unitType() != null && !request.unitType().isBlank()
                && !Set.of("PER_HORSE", "PER_REQUEST", "PER_TRIP").contains(request.unitType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Đơn vị tính không hợp lệ");
        }

        PricingItemConfig config = configRepository.findById(definition.code()).orElseGet(() -> {
            PricingItemConfig created = new PricingItemConfig();
            created.setItemCode(definition.code());
            return created;
        });
        config.setUnitType(blankToNull(request.unitType()));
        config.setUnitPriceUsd(request.priceUsd());
        config.setBenefits(blankToNull(request.benefits()));
        config.setRequired("PACKAGE".equals(definition.category()) || request.required());
        config.setIncludedServiceCodes(inclusions);
        config.setUpdatedBy(managerId != null && userRepository.existsById(managerId) ? managerId : null);
        config.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        return toCatalogItem(definition, configRepository.saveAndFlush(config));
    }

    @Transactional(readOnly = true)
    public PricingDto.QuoteResponse preview(PricingDto.PreviewRequest request) {
        return calculate(request.packageCode(), request.serviceCodes(), request.horseCount(),
                request.stallSizes(), null, null);
    }

    @Transactional(readOnly = true)
    public PricingDto.QuoteResponse quoteForRequest(UUID requestId, UUID currentUserId, boolean customer) {
        TransportRequest request = requestRepository.findById(requestId).orElseThrow(PricingService::notFound);
        if (customer && !currentUserId.equals(request.getCustomerId())) {
            throw notFound();
        }
        var confirmed = quoteRepository.findTopByRequestIdOrderByVersionDesc(requestId);
        if (confirmed.isPresent()) {
            List<String> selected = selectionRepository.findByRequestId(requestId).stream()
                    .map(TransportRequestPricingSelection::getItemCode).toList();
            String packageCode = selectedPackage(selected);
            List<String> services = selected.stream().filter(SERVICE_CODES::contains).toList();
            return confirmedQuote(confirmed.get(), packageCode, services);
        }

        List<String> selected = selectionRepository.findByRequestId(requestId).stream()
                .map(TransportRequestPricingSelection::getItemCode).toList();
        String packageCode = selectedPackage(selected);
        List<String> serviceCodes = selected.stream().filter(SERVICE_CODES::contains).toList();
        if (packageCode == null && request.getEstimatedAmount() != null) {
            return new PricingDto.QuoteResponse("LEGACY", request.getCurrency(), null,
                    request.getEstimatedAmount(), request.getCurrency(), false, List.of(), List.of(), null,
                    null, List.of(), null);
        }
        if (packageCode == null) {
            return new PricingDto.QuoteResponse("DRAFT", USD, null, null, null, false,
                    List.of("Chọn gói vận chuyển"), List.of(), null, null, List.of(), null);
        }
        List<String> stallSizes = stallRepository != null
                ? stallRepository.findByRequestIdOrderByHorseIdAsc(requestId).stream().map(TransportRequestStall::getSize).toList()
                : List.of();
        PricingDto.QuoteResponse draft = calculate(packageCode, serviceCodes, request.getHorseIds().size(),
                stallSizes, request.getEstimatedAmount(), request.getCurrency());
        boolean incompatibleHistory = !USD.equalsIgnoreCase(request.getCurrency())
                || (request.getEstimatedAmount() != null
                && (draft.totalAmount() == null || request.getEstimatedAmount().compareTo(draft.totalAmount()) != 0));
        if (!incompatibleHistory) return draft;
        List<String> missing = new ArrayList<>(draft.missingItems());
        missing.add("Báo giá lịch sử khác với giá USD hiện tại");
        return new PricingDto.QuoteResponse(draft.status(), draft.currency(), draft.totalAmount(),
                draft.legacyAmount(), draft.legacyCurrency(), false, List.copyOf(missing),
                draft.lines(), draft.confirmedAt(), draft.packageCode(), draft.selectedServiceCodes(),
                draft.fingerprint());
    }

    @Transactional
    public PricingDto.QuoteResponse saveSelection(UUID requestId, UUID currentUserId, boolean customer,
                                                  PricingDto.SelectionRequest selection) {
        TransportRequest request = requestRepository.findByIdForUpdate(requestId)
                .orElseThrow(PricingService::notFound);
        if (!customer) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Quản lý logistics chỉ có quyền thẩm định báo giá, không được sửa đổi gói dịch vụ khách hàng đã chọn");
        }
        if (!currentUserId.equals(request.getCustomerId())) {
            throw notFound();
        }
        if (!PENDING.equals(request.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Chỉ có thể thay đổi lựa chọn giá khi yêu cầu đang chờ thẩm định");
        }
        validateSelection(selection.packageCode(), selection.serviceCodes());
        selectionRepository.deleteByRequestId(requestId);
        selectionRepository.flush();
        selectionRepository.saveAll(selectionCodes(selection.packageCode(), selection.serviceCodes()).stream()
                .map(code -> {
                    TransportRequestPricingSelection row = new TransportRequestPricingSelection();
                    row.setRequestId(requestId);
                    row.setItemCode(code);
                    return row;
                }).toList());
        return quoteForRequest(requestId, currentUserId, customer);
    }

    @Transactional(readOnly = true)
    public boolean hasPricingSelection(UUID requestId) {
        return !selectionRepository.findByRequestId(requestId).isEmpty();
    }

    @Transactional
    public TransportRequest approveAndConfirmQuote(UUID requestId, UUID managerId, String previewFingerprint) {
        TransportRequest request = requestRepository.findByIdForUpdate(requestId)
                .orElseThrow(PricingService::notFound);
        if (!PENDING.equals(request.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chỉ xử lý được yêu cầu đang chờ thẩm định (trạng thái hiện tại: " + request.getStatus() + ")");
        }

        List<String> selected = selectionRepository.findByRequestId(requestId).stream()
                .map(TransportRequestPricingSelection::getItemCode).toList();
        String packageCode = selectedPackage(selected);
        List<String> services = selected.stream().filter(SERVICE_CODES::contains).toList();
        if (packageCode == null) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chưa thể xác nhận báo giá: yêu cầu chưa chọn gói vận chuyển");
        }

        List<String> stallSizes = stallRepository != null
                ? stallRepository.findByRequestIdOrderByHorseIdAsc(requestId).stream().map(TransportRequestStall::getSize).toList()
                : List.of();
        PricingDto.QuoteResponse draft = calculate(packageCode, services, request.getHorseIds().size(),
                stallSizes, request.getEstimatedAmount(), request.getCurrency());
        if (!draft.canConfirm()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chưa thể xác nhận báo giá. Cần cấu hình giá và đơn vị tính cho: "
                            + String.join(", ", draft.missingItems()));
        }
        if (!draft.fingerprint().equals(previewFingerprint)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Bảng giá hoặc lựa chọn đã thay đổi kể từ lần xem trước; hãy tải lại báo giá rồi xác nhận lại.");
        }
        BigDecimal total = draft.totalAmount();
        if (request.getEstimatedAmount() != null) {
            if (!USD.equalsIgnoreCase(request.getCurrency())
                    || request.getEstimatedAmount().compareTo(total) != 0) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Yêu cầu đã có báo giá lịch sử khác với báo giá USD hiện tại; không tự ghi đè hoặc quy đổi dữ liệu.");
            }
        } else if (!USD.equalsIgnoreCase(request.getCurrency())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Đơn vị tiền tệ lịch sử không phải USD; cần xử lý báo giá riêng, hệ thống không tự quy đổi.");
        }

        TransportRequestQuote quote = new TransportRequestQuote();
        quote.setRequestId(requestId);
        quote.setVersion(quoteRepository.findTopByRequestIdOrderByVersionDesc(requestId)
                .map(existing -> existing.getVersion() + 1).orElse(1));
        quote.setTotalAmount(total);
        quote.setCurrency(USD);
        quote.setCreatedBy(managerId);
        quote.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
        quote = quoteRepository.saveAndFlush(quote);

        int lineOrder = 0;
        List<TransportRequestQuoteLine> lines = new ArrayList<>();
        for (PricingDto.QuoteLine line : draft.lines()) {
            TransportRequestQuoteLine snapshot = new TransportRequestQuoteLine();
            snapshot.setQuoteId(quote.getQuoteId());
            snapshot.setItemCode(line.code());
            snapshot.setItemNameSnapshot(line.name());
            snapshot.setCategorySnapshot(line.category());
            snapshot.setBenefitsSnapshot(line.benefits());
            snapshot.setUnitType(line.unitType());
            snapshot.setQuantity(line.quantity());
            snapshot.setUnitPriceUsd(line.unitPriceUsd());
            snapshot.setLineTotalUsd(line.lineTotalUsd());
            snapshot.setRequired(line.required());
            snapshot.setIncludedInPackage(line.includedInPackage());
            snapshot.setLineOrder(lineOrder++);
            lines.add(snapshot);
        }
        quoteLineRepository.saveAll(lines);

        request.setEstimatedAmount(total);
        request.setCurrency(USD);
        request.setStatus(MANAGER_APPROVED);
        request.setApprovedBy(managerId);
        request.setApprovedAt(LocalDateTime.now(ZoneOffset.UTC));
        request = requestRepository.saveAndFlush(request);
        access.notify(request.getCustomerId(), "REQUEST_STATUS", "Báo giá đã được phê duyệt bước 1",
                "Báo giá " + total.toPlainString() + " USD đã được Logistics Manager xác nhận. Yêu cầu đang được chuyển sang Chuyên viên kiểm tra hồ sơ.",
                "transport_requests", requestId);
        return request;
    }

    private PricingDto.QuoteResponse calculate(String packageCode, List<String> selectedServiceCodes,
                                               int horseCount, List<String> stallSizes,
                                               BigDecimal legacyAmount, String legacyCurrency) {
        validateSelection(packageCode, selectedServiceCodes);
        Map<String, PricingItemConfig> configs = loadConfigs();
        ItemDefinition packageDefinition = ITEMS.get(packageCode);
        PricingItemConfig packageConfig = configs.get(packageCode);
        Set<String> included = packageConfig == null ? Set.of() : packageConfig.getIncludedServiceCodes();
        Set<String> services = new LinkedHashSet<>(selectedServiceCodes == null ? List.of() : selectedServiceCodes);
        services.addAll(included);
        for (String serviceCode : SERVICE_CODES) {
            PricingItemConfig config = configs.get(serviceCode);
            if (config != null && config.isRequired()) services.add(serviceCode);
        }

        List<PricingDto.QuoteLine> lines = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        boolean complete = true;
        LineResult packageLine = buildLine(packageDefinition, packageConfig, horseCount, false);
        lines.add(packageLine.line());
        if (packageLine.missing()) missing.add(packageDefinition.name());
        if (packageLine.line().lineTotalUsd() == null) complete = false;
        else total = total.add(packageLine.line().lineTotalUsd());

        if (stallSizes != null && !stallSizes.isEmpty() && stallPricingService != null) {
            StallPricingConfig stallConfig = stallPricingService.getOrCreateCurrentConfig();
            Map<String, Long> stallCounts = stallSizes.stream()
                    .filter(s -> s != null && !s.isBlank())
                    .map(s -> s.trim().toUpperCase(Locale.ROOT))
                    .collect(Collectors.groupingBy(s -> s, Collectors.counting()));

            List<String> orderedSizes = List.of("SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE");
            for (String size : orderedSizes) {
                if (!stallCounts.containsKey(size)) continue;
                long count = stallCounts.get(size);
                StallPricingDto.SizeDetail detail = stallPricingService.getSizeDetail(size, stallConfig);
                BigDecimal unitPrice = detail != null ? detail.priceUsd() : null;
                BigDecimal lineTotal = unitPrice != null ? unitPrice.multiply(BigDecimal.valueOf(count)) : null;
                boolean priceConfigured = unitPrice != null;

                PricingDto.QuoteLine stallLine = new PricingDto.QuoteLine(
                        "STALL_" + size,
                        "Phí kích thước chuồng: " + (detail != null ? detail.label() : size) + " (" + (detail != null ? detail.dimensionsFormatted() : "") + ")",
                        "SERVICE",
                        "Chuồng tiêu chuẩn kích thước " + (detail != null ? detail.dimensionsFormatted() : ""),
                        "PER_HORSE",
                        (int) count,
                        unitPrice,
                        lineTotal,
                        true,
                        false,
                        priceConfigured,
                        true
                );
                lines.add(stallLine);
                if (!priceConfigured) {
                    missing.add("Giá chuồng " + size);
                    complete = false;
                } else {
                    total = total.add(lineTotal);
                }
            }
        }

        for (String serviceCode : SERVICE_CODES) {
            if (!services.contains(serviceCode)) continue;
            ItemDefinition definition = ITEMS.get(serviceCode);
            PricingItemConfig config = configs.get(serviceCode);
            boolean isIncluded = included.contains(serviceCode);
            LineResult result = buildLine(definition, config, horseCount, isIncluded);
            lines.add(result.line());
            if (result.missing()) missing.add(definition.name());
            if (result.line().lineTotalUsd() == null) {
                complete = false;
            } else {
                total = total.add(result.line().lineTotalUsd());
            }
        }

        return new PricingDto.QuoteResponse("DRAFT", USD, complete ? total : null,
                legacyAmount, legacyCurrency, complete, List.copyOf(missing), List.copyOf(lines), null,
                packageCode, normalizeCodes(selectedServiceCodes).stream().sorted().toList(),
                complete ? fingerprint(lines, total) : null);
    }

    private LineResult buildLine(ItemDefinition definition, PricingItemConfig config,
                                 int horseCount, boolean included) {
        boolean required = "PACKAGE".equals(definition.category())
                || (config != null && config.isRequired());
        String unit = config == null ? null : config.getUnitType();
        BigDecimal price = config == null ? null : config.getUnitPriceUsd();
        int calculatedQuantity = unit == null ? 0 : quantity(unit, horseCount);
        Integer quantity = calculatedQuantity > 0 ? calculatedQuantity : null;
        boolean priceConfigured = price != null;
        boolean unitConfigured = quantity != null;
        boolean missing = !included && (!priceConfigured || !unitConfigured);
        BigDecimal lineTotal = included ? BigDecimal.ZERO
                : missing ? null : price.multiply(BigDecimal.valueOf(quantity));
        PricingDto.QuoteLine line = new PricingDto.QuoteLine(
                definition.code(), definition.name(), definition.category(),
                config == null ? null : config.getBenefits(),
                unit, quantity, included ? null : price, lineTotal, required, included,
                included || priceConfigured, included || unitConfigured);
        return new LineResult(line, missing);
    }

    private PricingDto.QuoteResponse confirmedQuote(TransportRequestQuote quote, String packageCode,
                                                    List<String> selectedServiceCodes) {
        List<PricingDto.QuoteLine> lines = quoteLineRepository.findByQuoteIdOrderByLineOrderAsc(quote.getQuoteId())
                .stream().map(line -> new PricingDto.QuoteLine(
                        line.getItemCode(), line.getItemNameSnapshot(), line.getCategorySnapshot(),
                        line.getBenefitsSnapshot(), line.getUnitType(), line.getQuantity(),
                        line.getUnitPriceUsd(), line.getLineTotalUsd(), line.isRequired(),
                        line.isIncludedInPackage(), line.getUnitPriceUsd() != null || line.isIncludedInPackage(),
                        line.getUnitType() != null || line.isIncludedInPackage()))
                .toList();
        return new PricingDto.QuoteResponse("CONFIRMED", quote.getCurrency(), quote.getTotalAmount(),
                null, null, true, List.of(), lines, quote.getCreatedAt(),
                packageCode, normalizeCodes(selectedServiceCodes).stream().sorted().toList(), null);
    }

    private static String fingerprint(List<PricingDto.QuoteLine> lines, BigDecimal total) {
        String lineData = lines.stream().map(line -> String.join(":",
                        line.code(), String.valueOf(line.unitType()), String.valueOf(line.quantity()),
                        String.valueOf(line.unitPriceUsd()), String.valueOf(line.lineTotalUsd()),
                        Boolean.toString(line.required()), Boolean.toString(line.includedInPackage())))
                .collect(Collectors.joining("|"));
        return total.toPlainString() + ";" + lineData;
    }

    private PricingDto.CatalogItem toCatalogItem(ItemDefinition definition, PricingItemConfig config) {
        boolean required = "PACKAGE".equals(definition.category()) || (config != null && config.isRequired());
        List<String> included = config == null ? List.of()
                : config.getIncludedServiceCodes().stream().sorted().toList();
        return new PricingDto.CatalogItem(
                definition.code(), definition.name(), definition.category(),
                config == null ? null : config.getBenefits(),
                config == null ? null : config.getUnitPriceUsd(),
                config == null ? null : config.getUnitType(),
                required, included,
                config != null && config.getUnitPriceUsd() != null,
                config != null && config.getUnitType() != null,
                config == null ? null : config.getUpdatedAt());
    }

    private Map<String, PricingItemConfig> loadConfigs() {
        return configRepository.findAll().stream()
                .collect(Collectors.toMap(PricingItemConfig::getItemCode, config -> config));
    }

    private static int quantity(String unit, int horseCount) {
        return switch (unit) {
            case "PER_HORSE" -> horseCount;
            case "PER_REQUEST", "PER_TRIP" -> 1;
            default -> 0;
        };
    }

    private static void validateSelection(String packageCode, List<String> serviceCodes) {
        if (!PACKAGE_CODES.contains(packageCode)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mã gói vận chuyển không hợp lệ");
        }
        Set<String> unique = normalizeCodes(serviceCodes);
        if (unique.size() != (serviceCodes == null ? 0 : serviceCodes.size())
                || unique.stream().anyMatch(code -> !SERVICE_CODES.contains(code))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Danh sách dịch vụ bổ sung không hợp lệ hoặc bị lặp");
        }
    }

    private static String selectedPackage(List<String> selectedCodes) {
        List<String> packages = selectedCodes.stream().filter(PACKAGE_CODES::contains).toList();
        if (packages.size() > 1) {
            throw new ApiException(HttpStatus.CONFLICT, "Yêu cầu có nhiều hơn một gói vận chuyển");
        }
        return packages.stream().findFirst().orElse(null);
    }

    private static List<String> selectionCodes(String packageCode, List<String> serviceCodes) {
        List<String> codes = new ArrayList<>();
        codes.add(packageCode);
        normalizeCodes(serviceCodes).stream().sorted().forEach(codes::add);
        return codes;
    }

    private static Set<String> normalizeCodes(List<String> codes) {
        if (codes == null) return new LinkedHashSet<>();
        return codes.stream().filter(code -> code != null)
                .map(code -> code.trim().toUpperCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static ItemDefinition definition(String code) {
        ItemDefinition item = ITEMS.get(code == null ? null : code.trim().toUpperCase(Locale.ROOT));
        if (item == null) throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hạng mục bảng giá");
        return item;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu vận chuyển");
    }

    private record ItemDefinition(String code, String name, String category) {}
    private record LineResult(PricingDto.QuoteLine line, boolean missing) {}
}
