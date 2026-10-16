package com.equiflow.service;

import com.equiflow.dto.LocationRequest;
import com.equiflow.dto.LocationResponse;
import com.equiflow.entity.Location;
import com.equiflow.exception.ApiException;
import com.equiflow.repository.LocationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class LocationService {

    private final LocationRepository locationRepository;

    public LocationService(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    public List<LocationResponse> findAll() {
        return locationRepository.findAllByOrderByNameAsc().stream()
                .map(LocationService::toResponse)
                .toList();
    }

    public LocationResponse findById(UUID id) {
        return toResponse(getOrThrow(id));
    }

    public LocationResponse create(LocationRequest req) {
        Location location = new Location();
        apply(location, req);
        return toResponse(locationRepository.save(location));
    }

    public LocationResponse update(UUID id, LocationRequest req) {
        Location location = getOrThrow(id);
        apply(location, req);
        return toResponse(locationRepository.save(location));
    }

    private Location getOrThrow(UUID id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy địa điểm"));
    }

    private static void apply(Location l, LocationRequest req) {
        l.setName(req.name().trim());
        l.setType(req.type().trim());
        l.setLatitude(req.latitude());
        l.setLongitude(req.longitude());
        l.setCapacity(req.capacity());
        l.setContactInfo(blankToNull(req.contactInfo()));
        l.setCountryCode(req.countryCode().trim().toUpperCase(Locale.ROOT)); // dữ liệu mẫu dùng mã ISO 3 chữ hoa (JPN, HKG)
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static LocationResponse toResponse(Location l) {
        return new LocationResponse(l.getLocationId(), l.getName(), l.getType(), l.getLatitude(),
                l.getLongitude(), l.getCapacity(), l.getContactInfo(), l.getCountryCode());
    }
}
