package com.equiflow.service;

import com.equiflow.dto.RoutePlacesDto;
import com.equiflow.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.http.HttpMethod.POST;
import static org.hamcrest.Matchers.containsString;

class GeoapifyPlacesServiceTest {

    @Test
    void springCanConstructTheServiceUsingItsConfiguredConstructor() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(
                    new MapPropertySource("test", Map.of("app.geoapify.api-key", "test-key")));
            context.registerBean(RestClient.Builder.class, () -> RestClient.builder());
            context.register(GeoapifyPlacesService.class);

            context.refresh();

            assertNotNull(context.getBean(GeoapifyPlacesService.class));
        }
    }

    @Test
    void searchesAlongRouteAndMapsRealPlaceCategories() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeoapifyPlacesService service = new GeoapifyPlacesService(builder.build(), "test-key");

        server.expect(requestTo("https://api.geoapify.com/v2/places"))
                .andExpect(method(POST))
                .andExpect(header("x-api-key", "test-key"))
                .andExpect(content().string(containsString("\"type\":\"polyline\"")))
                .andExpect(content().string(containsString("[139.5,35.0]")))
                .andExpect(content().string(containsString("\"service.vehicle.fuel\"")))
                .andRespond(withSuccess("""
                        {
                          "features": [
                            {
                              "properties": {
                                "place_id": "vet-1",
                                "name": "Tokyo Veterinary Clinic",
                                "lat": 35.1,
                                "lon": 139.6,
                                "categories": ["pet.veterinary"]
                              },
                              "geometry": {"type": "Point", "coordinates": [139.6, 35.1]}
                            },
                            {
                              "properties": {
                                "place_id": "fuel-1",
                                "name": "Tokyo Fuel",
                                "lat": 35.2,
                                "lon": 139.7,
                                "categories": ["service.vehicle.fuel"]
                              },
                              "geometry": {"type": "Point", "coordinates": [139.7, 35.2]}
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        RoutePlacesDto.Response response = service.findAlongRoute(new RoutePlacesDto(
                List.of(new RoutePlacesDto.Point(35.0, 139.5), new RoutePlacesDto.Point(35.3, 139.8)),
                RoutePlacesDto.Mode.FULL));

        assertEquals(2, response.places().size());
        assertEquals("vet", response.places().get(0).category());
        assertEquals("Tokyo Veterinary Clinic", response.places().get(0).name());
        assertEquals("fuel", response.places().get(1).category());
        assertEquals("full", response.mode());
        server.verify();
    }

    @Test
    void reportsMissingApiKeyWithoutCallingProvider() {
        GeoapifyPlacesService service = new GeoapifyPlacesService(RestClient.builder().build(), " ");

        ApiException error = assertThrows(ApiException.class, () -> service.findAlongRoute(new RoutePlacesDto(
                List.of(new RoutePlacesDto.Point(35.0, 139.5), new RoutePlacesDto.Point(35.3, 139.8)),
                RoutePlacesDto.Mode.FULL)));

        assertEquals(503, error.getStatus().value());
    }

    @Test
    void reportsWhenProviderRejectsTheApiKey() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeoapifyPlacesService service = new GeoapifyPlacesService(builder.build(), "invalid-key");
        server.expect(requestTo("https://api.geoapify.com/v2/places"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        ApiException error = assertThrows(ApiException.class, () -> service.findAlongRoute(new RoutePlacesDto(
                List.of(new RoutePlacesDto.Point(35.0, 139.5), new RoutePlacesDto.Point(35.3, 139.8)),
                RoutePlacesDto.Mode.FULL)));

        assertEquals(503, error.getStatus().value());
        org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("GEOAPIFY_API_KEY"));
        server.verify();
    }
}
