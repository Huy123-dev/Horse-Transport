package com.equiflow.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final Path publicUploadDirectory;

    public WebMvcConfig(@Value("${app.upload.dir:uploads}") String uploadDirectory) {
        this.publicUploadDirectory = Paths.get(uploadDirectory)
                .toAbsolutePath()
                .normalize()
                .resolve("public");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = publicUploadDirectory.toUri().toString();
        if (!location.endsWith("/")) {
            location += "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);
    }
}
