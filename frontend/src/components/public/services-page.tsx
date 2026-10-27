"use client";

import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Route, PackageCheck, ShieldCheck, Truck, Heart, Receipt, FilePlus, ArrowRight,
} from "lucide-react";

export function ServicesPage() {
  const { navigatePublic, setIntendedDestination } = useAppStore();

  const handleCreateRequest = () => {
    setIntendedDestination("request-create");
    navigatePublic("login");
  };

  const services = [
    {
      icon: Route,
      title: "A. Lập kế hoạch vận chuyển",
      desc: "Khai báo ngựa, điểm đi, điểm đến, lịch trình và thời hạn cần đáp ứng. Hệ thống kiểm tra điều kiện và đề xuất phương án phù hợp.",
    },
    {
      icon: PackageCheck,
      title: "B. Tùy chọn phương án vận chuyển",
      desc: "Lựa chọn phương thức vận chuyển, cấu hình chuồng (riêng hoặc ghép khi đủ điều kiện) và các dịch vụ bổ sung được hỗ trợ.",
    },
    {
      icon: ShieldCheck,
      title: "C. Hồ sơ và kiểm dịch",
      desc: "Tổng hợp giấy tờ cần thiết theo tuyến, theo dõi trạng thái thẩm định và yêu cầu bổ sung hồ sơ khi cần.",
    },
    {
      icon: Truck,
      title: "D. Theo dõi hành trình",
      desc: "Cập nhật trạng thái qua các mốc do nhân viên ghi nhận. Hệ thống không sử dụng GPS thời gian thực.",
    },
    {
      icon: Heart,
      title: "E. Chăm sóc và bàn giao ngựa",
      desc: "Ghi nhận thể trạng ngựa, báo cáo sự cố nếu có và lưu thông tin bàn giao đầy đủ.",
    },
    {
      icon: Receipt,
      title: "F. Chi phí và báo giá",
      desc: "Lựa chọn phương án, các option bổ sung và tổng hợp chi phí bằng USD. Giá mô phỏng được backend xác nhận lại.",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Dịch vụ vận chuyển"
        description="Các nhóm chức năng EQUIDELI hỗ trợ quản lý vận chuyển ngựa đua"
        icon={<Route className="h-5 w-5" />}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <Card key={s.title} className="card-hover h-full">
            <CardContent className="p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-bold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <p className="text-sm text-muted-foreground">Sẵn sàng bắt đầu quản lý vận chuyển ngựa đua của bạn?</p>
        <Button onClick={handleCreateRequest} size="lg" className="gap-2">
          <FilePlus className="h-4 w-4" /> Tạo yêu cầu vận chuyển
        </Button>
      </div>
    </div>
  );
}
