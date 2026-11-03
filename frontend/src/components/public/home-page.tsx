"use client";

import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Route, FileText, Heart, ArrowRight, FilePlus, BookOpen,
  PackageCheck, ClipboardCheck, Truck, Stethoscope, Receipt, FileCheck2, HeartPulse,
} from "lucide-react";

export function HomePage() {
  const { navigatePublic, setIntendedDestination } = useAppStore();

  const handleCreateRequest = () => {
    setIntendedDestination("request-create");
    navigatePublic("login");
  };

  const values = [
    { icon: FileText, title: "Quản lý hồ sơ", desc: "Khai báo ngựa, giải đấu, tuyến vận chuyển và hạn có mặt trong một yêu cầu tập trung." },
    { icon: Route, title: "Điều phối vận chuyển", desc: "Cấu hình chuồng, tổ chức điểm dừng và phân bổ phương tiện cùng nhân sự phù hợp." },
    { icon: ShieldCheck, title: "Kiểm soát giấy tờ", desc: "Tổng hợp giấy tờ theo tuyến, theo dõi trạng thái thẩm định và yêu cầu bổ sung." },
    { icon: Heart, title: "Theo dõi sức khỏe", desc: "Ghi nhận thể trạng ngựa qua từng mốc, báo cáo sự cố và theo dõi hồi phục." },
  ];

  const steps = [
    { num: "1", title: "Tạo yêu cầu", desc: "Khai báo ngựa, giải đấu, tuyến và hạn có mặt." },
    { num: "2", title: "Xem báo giá", desc: "Theo dõi hóa đơn và chi phí vận chuyển bằng USD trước khi thanh toán thủ công." },
    { num: "3", title: "Thẩm định & điều phối", desc: "Chuyên viên kiểm tra hồ sơ, lập kế hoạch và phân bổ phương tiện." },
    { num: "4", title: "Theo dõi & bàn giao", desc: "Cập nhật mốc hành trình, thể trạng ngựa và bàn giao an toàn." },
  ];

  const team = [
    {
      icon: ClipboardCheck,
      title: "Quản lý vận hành",
      role: "Logistics Manager",
      description: "Phê duyệt yêu cầu, xác nhận báo giá và giám sát tổng thể hành trình vận chuyển.",
    },
    {
      icon: Route,
      title: "Chuyên viên vận tải",
      role: "Transport Specialist",
      description: "Phối hợp sắp xếp chuồng trại, hồ sơ vận tải và kế hoạch tuyến đường an toàn.",
    },
    {
      icon: Truck,
      title: "Tài xế chuyên dụng",
      role: "Driver",
      description: "Phụ trách hành trình êm ái, cập nhật các mốc di chuyển và đảm bảo an toàn giao thông.",
    },
    {
      icon: HeartPulse,
      title: "Chuyên gia chăm sóc",
      role: "Escort",
      description: "Đồng hành theo dõi sức khỏe, hỗ trợ cho ăn và báo cáo khi cần chăm sóc y tế.",
    },
  ];

  return (
    <div>
      {/* HERO — split layout: content left, image right */}
      <section className="relative overflow-hidden bg-background">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:py-20 lg:px-8">
          {/* Left: content */}
          <div className="flex flex-col justify-center">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Vận chuyển ngựa đua chuyên nghiệp</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Vận chuyển ngựa đua xuyên biên giới, an toàn và đúng kế hoạch
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Quản lý tập trung yêu cầu vận chuyển, hồ sơ, kiểm dịch, phương tiện và hành trình của ngựa đua.
              Theo dõi tiến độ qua từng mốc, chủ động nhận diện rủi ro để hỗ trợ ngựa đến nơi và có đủ thời gian
              hồi phục trước cuộc thi.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={handleCreateRequest}
                size="lg"
                className="gap-2"
              >
                <FilePlus className="h-4 w-4" /> Tạo yêu cầu vận chuyển
              </Button>
              <Button
                onClick={() => navigatePublic("process")}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" /> Tìm hiểu quy trình
              </Button>
            </div>
          </div>

          {/* Right: horse image in a frame */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
              <img
                src="/equideli-hero.png"
                alt="Vận chuyển ngựa đua chuyên nghiệp EQUIDELI"
                className="h-full w-full object-cover"
                style={{ maxHeight: "500px" }}
              />
            </div>
            {/* Subtle accent bar */}
            <div className="absolute -bottom-3 -right-3 h-24 w-24 rounded-xl bg-primary/10 -z-10" />
            <div className="absolute -top-3 -left-3 h-20 w-20 rounded-full bg-[var(--copper)]/10 -z-10" />
          </div>
        </div>
      </section>

      {/* VALUES — 4 cards */}
      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Giá trị chính</h2>
            <p className="mt-2 text-sm text-muted-foreground">Những khả năng EQUIDELI mang lại cho chủ ngựa và đội ngũ vận chuyển</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <Card key={v.title} className="card-hover">
                <CardContent className="p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-base font-bold tracking-tight">{v.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CARE TEAM */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Đội ngũ chuyên trách</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Những người đồng hành cùng chuyến đi của bạn
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Mỗi chặng đường có sự phối hợp của đội ngũ vận hành, vận tải và chăm sóc ngựa.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <Card key={member.role} className="card-hover h-full border-border/80 bg-card shadow-sm">
                <CardHeader className="gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <member.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5">
                    <CardTitle className="text-base">{member.title}</CardTitle>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{member.role}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS — 4 steps */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Quy trình tổng quát</h2>
            <p className="mt-2 text-sm text-muted-foreground">Bốn bước chính từ yêu cầu đến bàn giao</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                <Card className="card-hover h-full">
                  <CardContent className="p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                      {s.num}
                    </div>
                    <h3 className="mt-3 text-sm font-bold tracking-tight">{s.title}</h3>
                    <p className="mt-1.5 text-xs text-muted-foreground">{s.desc}</p>
                  </CardContent>
                </Card>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 -translate-y-1/2 text-muted-foreground/40 z-10">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button onClick={() => navigatePublic("process")} variant="outline" className="gap-2">
              Xem quy trình chi tiết <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Vai trò trong hành trình</h2>
            <p className="mt-2 text-sm text-muted-foreground">Tìm hiểu cách các nhóm nghiệp vụ phối hợp trong hệ thống EQUIDELI</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { view: "specialist-info" as const, icon: FileCheck2, title: "Chuyên viên Thủ tục & Kiểm dịch", description: "Theo dõi bản ghi kiểm định và phối hợp hồ sơ theo dữ liệu hiện có." },
              { view: "coordinator-info" as const, icon: Route, title: "Điều phối Đội xe & Lộ trình", description: "Lập kế hoạch, quản lý phương tiện và các điểm dừng hành trình." },
              { view: "driver-info" as const, icon: Truck, title: "Tài xế / Nhân viên đi kèm", description: "Ghi nhận mốc thực tế, chăm sóc và báo cáo sự cố theo nhiệm vụ." },
            ].map((role) => (
              <Card key={role.view} className="card-hover">
                <CardContent className="p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <role.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-base font-bold">{role.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{role.description}</p>
                  <Button variant="ghost" className="mt-3 gap-2 px-0" onClick={() => navigatePublic(role.view)}>
                    Tìm hiểu vai trò <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Sẵn sàng tạo yêu cầu vận chuyển?</h2>
          <p className="mt-2 text-sm text-sidebar-foreground/70">Đăng nhập và bắt đầu quản lý vận chuyển ngựa đua của bạn.</p>
          <Button
            onClick={handleCreateRequest}
            size="lg"
            className="mt-6 gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
          >
            <FilePlus className="h-4 w-4" /> Tạo yêu cầu vận chuyển
          </Button>
        </div>
      </section>
    </div>
  );
}
