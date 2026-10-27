"use client";

import { lazy, Suspense } from "react";
import { useAppStore } from "@/store/app-store";

const CustomerDashboard = lazy(() => import("./customer/customer-dashboard").then((module) => ({ default: module.CustomerDashboard })));
const HorseList = lazy(() => import("./customer/horse-list").then((module) => ({ default: module.HorseList })));
const HorseDetail = lazy(() => import("./customer/horse-detail").then((module) => ({ default: module.HorseDetail })));
const RequestList = lazy(() => import("./customer/request-list").then((module) => ({ default: module.RequestList })));
const RequestDetail = lazy(() => import("./customer/request-detail").then((module) => ({ default: module.RequestDetail })));
const InspectionList = lazy(() => import("./specialist/inspection-list").then((module) => ({ default: module.InspectionList })));
const InspectionDetail = lazy(() => import("./specialist/inspection-detail").then((module) => ({ default: module.InspectionDetail })));
const RequestCreateWizard = lazy(() => import("./customer/request-create-wizard").then((module) => ({ default: module.RequestCreateWizard })));
const ApprovalList = lazy(() => import("./manager/approval-list").then((module) => ({ default: module.ApprovalList })));
const PlanList = lazy(() => import("./coordinator/plan-list").then((module) => ({ default: module.PlanList })));
const TransportPlanDetail = lazy(() => import("./coordinator/transport-plan-detail").then((module) => ({ default: module.TransportPlanDetail })));
const TransportPlanCreate = lazy(() => import("./coordinator/transport-plan-create").then((module) => ({ default: module.TransportPlanCreate })));
const StaffView = lazy(() => import("./manager/staff-view").then((module) => ({ default: module.StaffView })));
const PricingCatalogView = lazy(() => import("./manager/pricing-catalog-view").then((module) => ({ default: module.PricingCatalogView })));
const FleetView = lazy(() => import("./coordinator/fleet-view").then((module) => ({ default: module.FleetView })));
const NotificationsView = lazy(() => import("./shared/notifications-view").then((module) => ({ default: module.NotificationsView })));
const InvoiceList = lazy(() => import("./shared/invoice-list").then((module) => ({ default: module.InvoiceList })));
const InvoiceDetail = lazy(() => import("./shared/invoice-detail").then((module) => ({ default: module.InvoiceDetail })));
const ClaimsManagementView = lazy(() => import("./manager/claims-management-view").then((module) => ({ default: module.ClaimsManagementView })));
const FeedbackManagementView = lazy(() => import("./manager/feedback-management-view").then((module) => ({ default: module.FeedbackManagementView })));
const RecoveryDashboard = lazy(() => import("./customer/recovery-dashboard").then((module) => ({ default: module.RecoveryDashboard })));
const BackendUnavailableView = lazy(() => import("./shared/backend-unavailable-view").then((module) => ({ default: module.BackendUnavailableView })));
const ManagerDashboard = lazy(() => import("./manager/manager-dashboard").then((module) => ({ default: module.ManagerDashboard })));
const CoordinatorDashboard = lazy(() => import("./coordinator/coordinator-dashboard").then((module) => ({ default: module.CoordinatorDashboard })));
const SpecialistDashboard = lazy(() => import("./specialist/specialist-dashboard").then((module) => ({ default: module.SpecialistDashboard })));
const DriverDashboard = lazy(() => import("./driver/driver-dashboard").then((module) => ({ default: module.DriverDashboard })));
const EscortDashboard = lazy(() => import("./escort/escort-dashboard").then((module) => ({ default: module.EscortDashboard })));
const DriverPlanDetail = lazy(() => import("./driver/driver-plan-detail").then((module) => ({ default: module.DriverPlanDetail })));
const TripList = lazy(() => import("./shared/trip-list").then((module) => ({ default: module.TripList })));

function RoutedView() {
  const { user, view, navigate } = useAppStore();

  if (!user) return null;
  const role = user.roleId;

  if (view === "dashboard") {
    switch (role) {
      case "CUSTOMER": return <CustomerDashboard />;
      case "LOGISTICS_MANAGER": return <ManagerDashboard />;
      case "FLEET_COORDINATOR": return <CoordinatorDashboard />;
      case "TRANSPORT_SPECIALIST": return <SpecialistDashboard />;
      case "DRIVER": return <DriverDashboard />;
      case "ESCORT": return <EscortDashboard />;
      case "DRIVER_ESCORT": {
        if (user.staffType === "DRIVER") {
          return <DriverDashboard />;
        }
        if (user.staffType === "ESCORT") {
          return <EscortDashboard />;
        }
        return (
          <BackendUnavailableView
            title="Dashboard Nhân viên hiện trường"
            endpoint="/api/auth/me"
            description="Tài khoản nhân viên vận chuyển hiện trường chưa được cấu hình loại nhiệm vụ (Tài xế hoặc Nhân viên đi kèm). Vui lòng liên hệ Quản lý Logistics để được chỉ định nhiệm vụ."
          />
        );
      }
      default: return <BackendUnavailableView title="Dashboard" endpoint="/api/transport-plans" description="Vai trò này chưa có dashboard được hỗ trợ." />;
    }
  }

  if (view === "notifications") return <NotificationsView />;
  if (view === "trips") return ["DRIVER", "ESCORT", "DRIVER_ESCORT", "LOGISTICS_MANAGER", "FLEET_COORDINATOR"].includes(role)
    ? <TripList />
    : <BackendUnavailableView title="Chuyến vận chuyển" endpoint="/api/transport-plans" description="Vai trò hiện tại không có quyền xem danh sách chuyến vận chuyển." />;
  if (view === "trip-detail") return ["DRIVER", "ESCORT", "DRIVER_ESCORT"].includes(role)
    ? <DriverPlanDetail />
    : ["LOGISTICS_MANAGER", "FLEET_COORDINATOR"].includes(role)
      ? <TransportPlanDetail />
      : <BackendUnavailableView title="Chi tiết chuyến vận chuyển" endpoint="/api/transport-plans/{id}" description="Vai trò hiện tại không có quyền xem chi tiết chuyến vận chuyển." />;
  if (view === "request-detail") {
    return ["DRIVER", "ESCORT", "DRIVER_ESCORT"].includes(role)
      ? <BackendUnavailableView title="Chi tiết yêu cầu" endpoint="/api/transport-requests/{id}" description="Backend chưa cấp quyền đọc yêu cầu cho Driver/Escort." />
      : <RequestDetail />;
  }

  if (view === "horse-detail") return <HorseDetail />;

  if (view === "horses") return role === "CUSTOMER" ? <HorseList /> : <BackendUnavailableView title="Hồ sơ ngựa" endpoint="/api/horses/my-horses" description="Danh sách hồ sơ cá nhân chỉ dành cho khách hàng." />;
  if (view === "requests") return role === "CUSTOMER" ? <RequestList /> : <BackendUnavailableView title="Yêu cầu của tôi" endpoint="/api/transport-requests/my" description="Danh sách yêu cầu cá nhân chỉ dành cho khách hàng." />;
  if (view === "request-create") {
    return role === "CUSTOMER"
      ? <RequestCreateWizard />
      : <BackendUnavailableView title="Tạo yêu cầu vận chuyển" endpoint="POST /api/transport-requests" description="Chỉ khách hàng được tạo yêu cầu và backend kiểm tra quyền sở hữu từng hồ sơ ngựa." />;
  }

  if (view === "inspections") return role === "TRANSPORT_SPECIALIST" ? <InspectionList /> : <BackendUnavailableView title="Hồ sơ kiểm định" endpoint="/api/inspections" description="Chỉ chuyên viên thủ tục và kiểm dịch được xem hồ sơ kiểm định." />;
  if (view === "inspection-detail") return role === "TRANSPORT_SPECIALIST"
    ? <InspectionDetail />
    : <BackendUnavailableView title="Chi tiết kiểm định" endpoint="/api/inspections/{id}" description="Chỉ chuyên viên thủ tục và kiểm dịch được mở màn hình xử lý kiểm định." />;
  if (view === "compliance") return role === "TRANSPORT_SPECIALIST" ? <InspectionList /> : <BackendUnavailableView title="Kiểm dịch & thông quan" endpoint="/api/inspections" description="Chỉ chuyên viên thủ tục và kiểm dịch được xem bản ghi kiểm định." />;

  if (view === "approvals") return role === "LOGISTICS_MANAGER" ? <ApprovalList /> : <BackendUnavailableView title="Phê duyệt yêu cầu" endpoint="/api/transport-requests?status=PENDING" description="Chỉ Logistics Manager được xử lý yêu cầu." />;
  if (view === "approval-detail") return role === "LOGISTICS_MANAGER" ? <RequestDetail /> : <BackendUnavailableView title="Phê duyệt yêu cầu" endpoint="/api/transport-requests/{id}/approve|reject" description="Chỉ Logistics Manager được xử lý yêu cầu." />;
  if (view === "staff") return role === "LOGISTICS_MANAGER" ? <StaffView /> : <BackendUnavailableView title="Quản lý nhân sự" endpoint="/api/users" description="Chức năng nhân sự chỉ dành cho vai trò quản lý được backend cấp quyền." />;
  if (view === "pricing") return role === "LOGISTICS_MANAGER" ? <PricingCatalogView /> : <BackendUnavailableView title="Bảng giá dịch vụ" endpoint="/api/pricing/catalog" description="Chỉ Logistics Manager được cấu hình giá." />;

  if (view === "plans") return ["FLEET_COORDINATOR", "TRANSPORT_SPECIALIST"].includes(role)
    ? <PlanList />
    : <BackendUnavailableView title="Lập kế hoạch lộ trình" endpoint="/api/transport-plans" description="Danh sách kế hoạch dành cho điều phối viên đội xe và chuyên viên vận tải." />;
  if (view === "plan-create") return role === "FLEET_COORDINATOR" ? <TransportPlanCreate /> : <BackendUnavailableView title="Tạo kế hoạch vận chuyển" endpoint="POST /api/transport-plans" description="Chỉ điều phối viên đội xe được tạo kế hoạch." />;
  if (view === "plan-detail") {
    return ["CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR"].includes(role)
      ? <TransportPlanDetail />
      : <BackendUnavailableView title="Chi tiết kế hoạch" endpoint="/api/transport-plans/{id}" description="Giao diện quản lý kế hoạch chỉ dành cho các vai trò điều phối và quản lý." />;
  }

  if (view === "fleet") return role === "FLEET_COORDINATOR" ? <FleetView /> : <BackendUnavailableView title="Đội xe & phương tiện" endpoint="/api/transport-assets" description="Chỉ điều phối viên đội xe được quản lý phương tiện." />;

  if (view === "invoices") return ["CUSTOMER", "LOGISTICS_MANAGER"].includes(role) ? <InvoiceList /> : <BackendUnavailableView title="Hóa đơn" endpoint="/api/invoices" description="Backend chỉ cấp quyền hóa đơn cho khách hàng và Logistics Manager." />;
  if (view === "invoice-detail") return ["CUSTOMER", "LOGISTICS_MANAGER"].includes(role) ? <InvoiceDetail /> : <BackendUnavailableView title="Chi tiết hóa đơn" endpoint="/api/invoices/{id}" description="Backend chỉ cấp quyền hóa đơn cho khách hàng và Logistics Manager." />;

  if (view === "claims-management") return role === "LOGISTICS_MANAGER" ? <ClaimsManagementView /> : <BackendUnavailableView title="Quản lý bồi thường" endpoint="/api/compensation-claims" description="Chỉ Logistics Manager được quản lý các vụ việc bồi thường." />;
  if (view === "feedback-management") return role === "LOGISTICS_MANAGER" ? <FeedbackManagementView /> : <BackendUnavailableView title="Đánh giá dịch vụ" endpoint="/api/feedbacks" description="Chỉ Logistics Manager được xem tổng hợp đánh giá chất lượng dịch vụ." />;

  if (view === "recovery-dashboard") return <RecoveryDashboard />;

  navigate("dashboard");
  return null;
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Đang tải trang">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );
}

export function ViewRouter() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RoutedView />
    </Suspense>
  );
}
