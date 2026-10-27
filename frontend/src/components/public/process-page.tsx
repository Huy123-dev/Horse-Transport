"use client";

import { useAppStore } from "@/store/app-store";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FilePlus, Receipt, ShieldCheck, Route, Truck, Heart,
  FilePlus as StartIcon, ArrowRight, Home as HomeIcon,
} from "lucide-react";

export function ProcessPage() {
  const { navigatePublic } = useAppStore();

  const steps = [
    {
      num: 1,
      icon: FilePlus,
      title: "Tiếp nhận yêu cầu",
      desc: "Khách hàng khai báo ngựa, giải đấu, tuyến vận chuyển và hạn có mặt dự kiến.",
    },
    {
      num: 2,
      icon: Receipt,
      title: "Lựa chọn phương án và báo giá",
      desc: "Khách hàng xem các phương án khả thi, lựa chọn option được phép và xem tổng chi phí bằng USD.",
    },
    {
      num: 3,
      icon: ShieldCheck,
      title: "Thẩm định hồ sơ",
      desc: "Chuyên viên kiểm tra giấy tờ, yêu cầu kiểm dịch và các điều kiện cần xác nhận theo tuyến.",
    },
    {
      num: 4,
      icon: Route,
      title: "Lập kế hoạch và điều phối",
      desc: "Bố trí phương tiện, cấu hình chuồng, nhân sự, các chặng và lịch trình phù hợp.",
    },
    {
      num: 5,
      icon: Truck,
      title: "Thực hiện hành trình",
      desc: "Nhân viên cập nhật thủ công các mốc hành trình, thể trạng và sự cố nếu có.",
    },
    {
      num: 6,
      icon: Heart,
      title: "Bàn giao và hồi phục",
      desc: "Ghi nhận tình trạng ngựa khi bàn giao, lưu biên bản và theo dõi thời gian hồi phục theo yêu cầu đã xác nhận.",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Quy trình vận chuyển"
        description="Sáu bước từ tiếp nhận yêu cầu đến bàn giao và hồi phục"
        icon={<Route className="h-5 w-5" />}
      />

      {/* Timeline */}
      <div className="mt-8 space-y-4">
        {steps.map((step, idx) => (
          <div key={step.num} className="relative flex gap-4">
            {/* Connecting line */}
            {idx < steps.length - 1 && (
              <div className="absolute left-[23px] top-12 h-[calc(100%-1rem)] w-0.5 bg-border" />
            )}
            {/* Number circle */}
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg ring-4 ring-background">
              {step.num}
            </div>
            {/* Content card */}
            <Card className="card-hover flex-1">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold tracking-tight">
                      Bước {step.num} — {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="mt-8 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)]/30 p-4">
        <p className="text-sm text-[var(--warning-fg)]">
          ⚠️ Quy trình thực tế có thể phụ thuộc vào tuyến, hồ sơ và kết quả thẩm định.
          Không phải mọi chuyến đều có cùng giấy tờ, thời gian hoặc quy trình pháp lý.
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Button onClick={() => navigatePublic("login")} size="lg" className="gap-2">
          <StartIcon className="h-4 w-4" /> Bắt đầu tạo yêu cầu
        </Button>
        <Button onClick={() => navigatePublic("home")} variant="outline" size="lg" className="gap-2">
          <HomeIcon className="h-4 w-4" /> Quay về trang chủ
        </Button>
      </div>
    </div>
  );
}
