"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { User, ShieldCheck, FileCheck2, Route, Truck, HeartHandshake, Award, type LucideIcon } from "lucide-react";

export type RoleId =
  | "CUSTOMER"
  | "LOGISTICS_MANAGER"
  | "TRANSPORT_SPECIALIST"
  | "FLEET_COORDINATOR"
  | "DRIVER"
  | "ESCORT"
  | "DRIVER_ESCORT"
  | string;

export interface RoleConfig {
  label: string;
  color: string;           // HEX
  bgClass: string;          // CSS Utility class
  borderClass: string;
  textClass: string;
  icon: LucideIcon;
}

export function getRoleConfig(roleId?: string | null, staffType?: string | null): RoleConfig {
  if (!roleId) {
    return {
      label: "Chưa phân vai trò",
      color: "#C4B8AC",
      bgClass: "bg-[#302821]",
      borderClass: "border-[#766454]",
      textClass: "text-[#C4B8AC]",
      icon: Award,
    };
  }

  if (roleId === "DRIVER_ESCORT") {
    if (staffType === "DRIVER") {
      return {
        label: "Tài xế (Hiện trường)",
        color: "#5EEAD4",
        bgClass: "role-badge-driver",
        borderClass: "border-[var(--role-driver-border)]",
        textClass: "text-[var(--role-driver)]",
        icon: Truck,
      };
    }
    if (staffType === "ESCORT") {
      return {
        label: "Nhân viên đi kèm",
        color: "#F9A8D4",
        bgClass: "role-badge-escort",
        borderClass: "border-[var(--role-escort-border)]",
        textClass: "text-[var(--role-escort)]",
        icon: HeartHandshake,
      };
    }
  }

  switch (roleId) {
    case "CUSTOMER":
      return {
        label: ROLE_LABELS.CUSTOMER || "Khách hàng",
        color: "#E9A8FF",
        bgClass: "role-badge-customer",
        borderClass: "border-[var(--role-customer-border)]",
        textClass: "text-[var(--role-customer)]",
        icon: User,
      };
    case "LOGISTICS_MANAGER":
      return {
        label: ROLE_LABELS.LOGISTICS_MANAGER || "Quản lý Logistics",
        color: "#FF9F80",
        bgClass: "role-badge-manager",
        borderClass: "border-[var(--role-manager-border)]",
        textClass: "text-[var(--role-manager)]",
        icon: ShieldCheck,
      };
    case "TRANSPORT_SPECIALIST":
      return {
        label: ROLE_LABELS.TRANSPORT_SPECIALIST || "Chuyên viên vận tải & hồ sơ",
        color: "#7DD3FC",
        bgClass: "role-badge-specialist",
        borderClass: "border-[var(--role-specialist-border)]",
        textClass: "text-[var(--role-specialist)]",
        icon: FileCheck2,
      };
    case "FLEET_COORDINATOR":
      return {
        label: ROLE_LABELS.FLEET_COORDINATOR || "Điều phối viên Đội xe & Lộ trình",
        color: "#C4B5FD",
        bgClass: "role-badge-coordinator",
        borderClass: "border-[var(--role-coordinator-border)]",
        textClass: "text-[var(--role-coordinator)]",
        icon: Route,
      };
    case "DRIVER":
      return {
        label: ROLE_LABELS.DRIVER || "Tài xế",
        color: "#5EEAD4",
        bgClass: "role-badge-driver",
        borderClass: "border-[var(--role-driver-border)]",
        textClass: "text-[var(--role-driver)]",
        icon: Truck,
      };
    case "ESCORT":
      return {
        label: ROLE_LABELS.ESCORT || "Nhân viên đi kèm",
        color: "#F9A8D4",
        bgClass: "role-badge-escort",
        borderClass: "border-[var(--role-escort-border)]",
        textClass: "text-[var(--role-escort)]",
        icon: HeartHandshake,
      };
    default:
      return {
        label: ROLE_LABELS[roleId] || roleId,
        color: "#D4AB82",
        bgClass: "bg-[#30231D]",
        borderClass: "border-[#5A4238]",
        textClass: "text-[#D4AB82]",
        icon: Award,
      };
  }
}

export interface RoleBadgeProps {
  roleId?: string | null;
  staffType?: string | null;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
}

export function RoleBadge({
  roleId,
  staffType,
  className,
  showIcon = true,
  size = "default",
}: RoleBadgeProps) {
  const config = getRoleConfig(roleId, staffType);
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    default: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full shadow-xs transition-colors select-none",
        config.bgClass,
        sizeClasses,
        className
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} />}
      <span>{config.label}</span>
    </span>
  );
}
