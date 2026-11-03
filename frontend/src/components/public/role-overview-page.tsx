"use client";

import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, FileCheck2, LogIn, Route, Truck, type LucideIcon } from "lucide-react";

export type RoleOverview = "specialist" | "coordinator" | "driver";

const content: Record<RoleOverview, {
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
  overview: string;
  duties: string[];
  process: string[];
  contribution: string;
}> = {
  specialist: {
    title: "Chuyên viên Thủ tục & Kiểm dịch",
    subtitle: "Theo dõi hồ sơ kiểm định và phối hợp chuẩn bị chứng từ cho hành trình ngựa đua.",
    image: "/role-specialist.svg",
    imageAlt: "Minh họa hồ sơ kiểm định và xác minh chứng từ",
    icon: FileCheck2,
    overview: "Vai trò tập trung vào các bản ghi kiểm định gắn với yêu cầu vận chuyển và phối hợp thông tin hồ sơ theo dữ liệu đang có trong hệ thống.",
    duties: ["Xem yêu cầu và hồ sơ ngựa trong phạm vi được cấp quyền.", "Tạo bản ghi kiểm định và cập nhật trạng thái qua API hiện có.", "Ghi nhận kết quả thực tế; không tự kết luận tuân thủ pháp luật theo quốc gia."],
    process: ["Mở hàng đợi kiểm định.", "Đối chiếu yêu cầu, ngựa và dữ liệu hồ sơ hiện có.", "Cập nhật trạng thái kiểm định; kết quả được lưu bởi backend."],
    contribution: "Chuyển thông tin hồ sơ có cấu trúc cho bộ phận điều phối và giúp phát hiện sớm phần cần kiểm tra thêm.",
  },
  coordinator: {
    title: "Điều phối viên Đội xe & Lộ trình",
    subtitle: "Lập kế hoạch vận chuyển, quản lý phương tiện và tổ chức các điểm dừng theo dữ liệu thực.",
    image: "/role-coordinator.svg",
    imageAlt: "Minh họa bản đồ tuyến đường và xe vận chuyển",
    icon: Route,
    overview: "Điều phối viên làm việc với transport plans, phương tiện và route stops được backend hỗ trợ.",
    duties: ["Tạo và hoàn thiện kế hoạch gắn với yêu cầu đã được duyệt.", "Quản lý phương tiện và phân công tài xế/người đi kèm.", "Thiết lập điểm dừng dự kiến; mỗi chuyến tối đa 4 người đi kèm."],
    process: ["Kiểm tra yêu cầu đã được duyệt.", "Lập kế hoạch, điểm dừng và phân công nguồn lực.", "Rà soát lịch trình và trạng thái sẵn sàng trước chuyến đi."],
    contribution: "Tổ chức các thông tin kế hoạch và phương tiện tại một nơi để các bên liên quan theo dõi.",
  },
  driver: {
    title: "Tài xế / Nhân viên đi kèm",
    subtitle: "Ghi nhận mốc hành trình, tình trạng chăm sóc và sự cố theo nhiệm vụ được phân công.",
    image: "/role-driver-escort.svg",
    imageAlt: "Minh họa nhân viên vận chuyển và chăm sóc ngựa",
    icon: Truck,
    overview: "Tài xế và nhân viên đi kèm cùng sử dụng một vai trò vận hành, với danh sách kế hoạch được giới hạn theo phân công.",
    duties: ["Cập nhật mốc hành trình và tọa độ khi được ghi nhận.", "Theo dõi sức khỏe ngựa và lưu ghi chú chăm sóc.", "Báo cáo sự cố và hoàn tất bàn giao kèm chứng từ."],
    process: ["Mở kế hoạch được phân công.", "Ghi nhận vị trí, chăm sóc và sự cố phát sinh.", "Hoàn tất bàn giao và gửi chứng từ liên quan."],
    contribution: "Cung cấp dữ liệu thực địa kịp thời để hỗ trợ theo dõi an toàn trong quá trình vận chuyển.",
  },
};

export function RoleOverviewPage({ role }: { role: RoleOverview }) {
  const { navigatePublic } = useAppStore();
  const page = content[role];

  return (
    <div>
      <section className="overflow-hidden bg-background">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-16">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <page.icon className="h-4 w-4" /> Vai trò vận hành EQUIDELI
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{page.title}</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{page.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => navigatePublic("login")} className="gap-2">
                <LogIn className="h-4 w-4" /> Đăng nhập tài khoản
              </Button>
              <Button onClick={() => navigatePublic("home")} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Trang chủ
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <img src={page.image} alt={page.imageAlt} className="aspect-[8/5] w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <h2 className="text-lg font-bold">Vai trò</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{page.overview}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h2 className="text-lg font-bold">Nhiệm vụ chính</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {page.duties.map((duty) => <li key={duty}>{duty}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h2 className="text-lg font-bold">Đóng góp cho hành trình</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{page.contribution}</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-background p-5 sm:p-7">
            <h2 className="text-xl font-bold">Quy trình phối hợp</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {page.process.map((step, index) => (
                <li key={step} className="rounded-xl border border-border p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={() => navigatePublic("services")} className="gap-2">
              Tìm hiểu dịch vụ <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
