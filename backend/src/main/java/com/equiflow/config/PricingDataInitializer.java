package com.equiflow.config;

import com.equiflow.entity.PricingItemConfig;
import com.equiflow.repository.PricingItemConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class PricingDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(PricingDataInitializer.class);

    private final PricingItemConfigRepository configRepository;

    public PricingDataInitializer(PricingItemConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedPricingCatalogIfEmpty() {
        if (configRepository.count() > 0) {
            return;
        }

        log.info("Bảng pricing_item_configs đang trống. Khởi tạo danh mục bảng giá dịch vụ chuẩn USD...");

        List<PricingItemConfig> defaults = List.of(
                create("BASIC_TRANSPORT", "PER_HORSE", "1500.00",
                        "Gói vận chuyển cơ bản: Xe chuyên dụng tiêu chuẩn, kiểm tra an toàn trước chuyến đi, theo dõi lộ trình cơ bản.",
                        true, Set.of()),
                create("STANDARD_TRANSPORT", "PER_HORSE", "2500.00",
                        "Gói vận chuyển tiêu chuẩn: Chuồng đệm tiêu chuẩn, bao gồm dịch vụ kiểm dịch hải quan và bác sĩ thú y đồng hành suốt tuyến.",
                        true, Set.of("CUSTOMS_DOCUMENTATION", "VETERINARY_SUPPORT")),
                create("PREMIUM_TRANSPORT", "PER_HORSE", "4000.00",
                        "Gói vận chuyển cao cấp VIP: Khoang chuồng riêng đệm chống sốc, bác sĩ thú y chuyên trách, bảo hiểm trọn gói và hỗ trợ thủ tục hải quan ưu tiên.",
                        true, Set.of("CUSTOMS_DOCUMENTATION", "VETERINARY_SUPPORT", "DEDICATED_STALL", "INSURANCE")),
                create("VETERINARY_SUPPORT", "PER_TRIP", "300.00",
                        "Bác sĩ thú y giàu kinh nghiệm kiểm tra thể trạng, sơ cứu và theo dõi sức khỏe liên tục trong suốt hành trình.",
                        false, Set.of()),
                create("CUSTOMS_DOCUMENTATION", "PER_REQUEST", "200.00",
                        "Hỗ trợ chuẩn bị và xử lý toàn diện hồ sơ kiểm dịch, chứng nhận tiêm chủng và giấy tờ thông quan hải quan.",
                        false, Set.of()),
                create("DEDICATED_STALL", "PER_HORSE", "500.00",
                        "Khoang chuồng riêng biệt diện tích rộng rãi, trang bị đệm rơm cao cấp chống trượt và chống rung lắc tối đa.",
                        false, Set.of()),
                create("SHARED_STALL", "PER_HORSE", "250.00",
                        "Khoang chuồng đôi có vách ngăn an toàn, lót đệm êm ái và hệ thống thông khí tiêu chuẩn.",
                        false, Set.of()),
                create("INSURANCE", "PER_HORSE", "350.00",
                        "Bảo hiểm rủi ro vận chuyển toàn diện cho ngựa theo giá trị thẩm định trong suốt quá trình giao nhận.",
                        false, Set.of()),
                create("GROOM_ESCORT", "PER_TRIP", "400.00",
                        "Chuyên viên chăm sóc ngựa (groom) đi cùng trên xe, đảm bảo cho ngựa ăn uống, giữ bình tĩnh và vệ sinh sạch sẽ.",
                        false, Set.of()),
                create("EMERGENCY_TRANSPORT", "PER_REQUEST", "600.00",
                        "Dịch vụ vận chuyển khẩn cấp 24/7 với phương tiện ưu tiên và trang thiết bị hỗ trợ hồi sức cấp cứu tại chỗ.",
                        false, Set.of()),
                create("ADDITIONAL_HANDLING", "PER_HORSE", "150.00",
                        "Xử lý và chăm sóc đặc biệt cho ngựa nhạy cảm, ngựa thi đấu hoặc theo yêu cầu hướng dẫn riêng của chủ ngựa.",
                        false, Set.of())
        );

        configRepository.saveAll(defaults);
        configRepository.flush();
        log.info("Đã khởi tạo thành công {} hạng mục bảng giá dịch vụ mặc định.", defaults.size());
    }

    private static PricingItemConfig create(String code, String unitType, String priceUsd,
                                            String benefits, boolean required, Set<String> inclusions) {
        PricingItemConfig config = new PricingItemConfig();
        config.setItemCode(code);
        config.setUnitType(unitType);
        config.setUnitPriceUsd(new BigDecimal(priceUsd));
        config.setBenefits(benefits);
        config.setRequired(required);
        config.setIncludedServiceCodes(new LinkedHashSet<>(inclusions));
        config.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        return config;
    }
}
