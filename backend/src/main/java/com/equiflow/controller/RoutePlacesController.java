package com.equiflow.controller;

import com.equiflow.dto.RoutePlacesDto;
import com.equiflow.service.GeoapifyPlacesService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/route-places")
public class RoutePlacesController {

    private final GeoapifyPlacesService placesService;

    public RoutePlacesController(GeoapifyPlacesService placesService) {
        this.placesService = placesService;
    }

    @PostMapping
    public RoutePlacesDto.Response findAlongRoute(@Valid @RequestBody RoutePlacesDto request) {
        return placesService.findAlongRoute(request);
    }
}
