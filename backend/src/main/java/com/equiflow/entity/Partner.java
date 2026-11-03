package com.equiflow.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/** Đối tác sở hữu phương tiện (bảng partners). Chỉ ánh xạ các cột cần để hiển thị/kiểm tra. */
@Entity
@Table(name = "partners")
@Getter
@Setter
public class Partner {

    @Id
    @Column(name = "partner_id")
    private UUID partnerId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 50)
    private String type;
}