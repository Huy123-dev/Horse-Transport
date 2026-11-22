package com.equiflow.service;

import com.equiflow.dto.RoutePlacesDto;
import com.equiflow.exception.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeoapifyPlacesService {

    private static final Logger logger = LoggerFactory.getLogger(GeoapifyPlacesService.class);
    private static final String PLACES_API_URL = "https://api.geoapify.com/v2/places";
    private static final int SEARCH_RADIUS_METERS = 5000;
    private static final int MAX_RESULTS = 500;
    private static final List<String> FULL_CATEGORIES = List.of(
            "office.government.customs",
            "airport",
            "pet.veterinary",
            "pet.animal_boarding",
            "service.vehicle.fuel",
            "leisure.picnic.picnic_site",
            "parking");
    private static final List<String> RARE_CATEGORIES = List.of(
            "office.government.customs",
            "airport",
            "pet.veterinary");

    private final RestClient restClient;
    private final String apiKey;

    @Autowired
    public GeoapifyPlacesService(
            RestClient.Builder builder,
            @Value("${app.geoapify.api-key:}") String apiKey) {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(15));
        this.restClient = builder.requestFactory(requestFactory).build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    GeoapifyPlacesService(RestClient restClient, String apiKey) {
        this.restClient = restClient;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    public RoutePlacesDto.Response findAlongRoute(RoutePlacesDto request) {
        if (apiKey.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa cấu hình GEOAPIFY_API_KEY ở backend để tìm điểm dừng.");
        }

        List<List<Double>> coordinates = request.path().stream()
                .map(point -> List.of(point.lng(), point.lat()))
                .toList();
        Map<String, Object> geometry = Map.of(
                "type", "LineString",
                "coordinates", coordinates);
        Map<String, Object> filter = Map.of(
                "type", "polyline",
                "geometry", geometry,
                "buffer", SEARCH_RADIUS_METERS);
        List<String> categories = request.mode() == RoutePlacesDto.Mode.FULL
                ? FULL_CATEGORIES
                : RARE_CATEGORIES;
        Map<String, Object> body = Map.of(
                "categories", categories,
                "filter", filter,
                "limit", MAX_RESULTS);

        try {
            JsonNode response = restClient.post()
                    .uri(PLACES_API_URL)
                    .header("x-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            return toResponse(response, request.mode());
        } catch (HttpStatusCodeException error) {
            int status = error.getStatusCode().value();
            logger.warn("Geoapify Places request returned HTTP {}", status);
            if (status == 401 || status == 403) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "GEOAPIFY_API_KEY không hợp lệ hoặc không có quyền sử dụng Places API.");
            }
            if (status == 429) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Geoapify đã vượt hạn mức yêu cầu. Vui lòng thử lại sau.");
            }
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Geoapify từ chối yêu cầu tìm điểm dừng (HTTP " + status + ").");
        } catch (RestClientException error) {
            logger.warn("Geoapify Places request failed: {}", error.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Geoapify không trả được dữ liệu điểm dừng. Vui lòng thử lại sau.");
        }
    }

    private RoutePlacesDto.Response toResponse(JsonNode response, RoutePlacesDto.Mode mode) {
        JsonNode features = response == null ? null : response.get("features");
        if (features == null || !features.isArray()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Geoapify trả về dữ liệu điểm dừng không hợp lệ.");
        }

        Map<String, RoutePlacesDto.Place> placesById = new LinkedHashMap<>();
        for (JsonNode feature : features) {
            JsonNode properties = feature.path("properties");
            JsonNode categories = properties.path("categories");
            String category = mapCategory(categories);
            JsonNode geometry = feature.path("geometry").path("coordinates");
            double lat = coordinate(properties.path("lat"), geometry, 1);
            double lng = coordinate(properties.path("lon"), geometry, 0);
            if (category == null || !Double.isFinite(lat) || !Double.isFinite(lng)) {
                continue;
            }

            String label = labelFor(category);
            String name = firstText(properties.path("name"), properties.path("address_line1"));
            if (name.isBlank()) {
                name = label;
            }
            String id = properties.path("place_id").asText("");
            if (id.isBlank()) {
                id = String.format("%s:%.5f,%.5f", category, lat, lng);
            }
            placesById.putIfAbsent(id, new RoutePlacesDto.Place(id, name, category, lat, lng));
        }
        return new RoutePlacesDto.Response(
                List.copyOf(placesById.values()),
                mode.name().toLowerCase());
    }

    private static double coordinate(JsonNode property, JsonNode geometry, int index) {
        if (property.isNumber()) {
            return property.asDouble();
        }
        return geometry.isArray() && geometry.size() > index && geometry.get(index).isNumber()
                ? geometry.get(index).asDouble()
                : Double.NaN;
    }

    private static String mapCategory(JsonNode categories) {
        if (!categories.isArray()) {
            return null;
        }
        List<String> values = new ArrayList<>();
        categories.forEach(value -> values.add(value.asText()));
        if (values.stream().anyMatch(value -> value.startsWith("office.government.customs"))) {
            return "border";
        }
        if (values.stream().anyMatch(value -> value.startsWith("airport"))) {
            return "airport";
        }
        if (values.stream().anyMatch(value -> value.startsWith("pet.veterinary"))) {
            return "vet";
        }
        if (values.stream().anyMatch(value -> value.startsWith("service.vehicle.fuel"))) {
            return "fuel";
        }
        if (values.stream().anyMatch(value -> value.startsWith("pet.animal_boarding"))) {
            return "boarding";
        }
        if (values.stream().anyMatch(value ->
                value.startsWith("leisure.picnic.picnic_site") || value.startsWith("parking"))) {
            return "rest";
        }
        return null;
    }

    private static String labelFor(String category) {
        return switch (category) {
            case "border" -> "Cửa khẩu / hải quan";
            case "airport" -> "Sân bay";
            case "vet" -> "Phòng khám thú y";
            case "fuel" -> "Trạm xăng";
            case "boarding" -> "Nơi lưu trú động vật";
            default -> "Khu nghỉ dọc đường";
        };
    }

    private static String firstText(JsonNode... values) {
        for (JsonNode value : values) {
            String text = value.asText("").trim();
            if (!text.isBlank()) {
                return text;
            }
        }
        return "";
    }
}
