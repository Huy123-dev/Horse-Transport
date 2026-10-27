(()=>{"use strict";module.exports = [
"[project]/src/app/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api-client.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$app$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/app-store.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$public$2f$public$2d$site$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/public/public-site.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$app$2f$app$2d$shell$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/app/app-shell.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$app$2f$empty$2d$state$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/app/empty-state.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
function Home() {
    const { user, setUser, intendedDestination, navigate, setIntendedDestination } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$app$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAppStore"])();
    const [checking, setChecking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [authError, setAuthError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let active = true;
        (async ()=>{
            try {
                const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiGet"])("/auth/me");
                if (active) {
                    setUser({
                        ...data,
                        roleName: data.roleId
                    });
                    // If already logged in and has intended destination, navigate there
                    if (intendedDestination) {
                        // Only allow request-create for CUSTOMER; others go to dashboard
                        if (data.roleId === "CUSTOMER" && intendedDestination === "request-create") {
                            navigate(intendedDestination);
                        } else {
                            navigate("dashboard");
                        }
                        setIntendedDestination(null);
                    }
                }
            } catch (err) {
                if (active) {
                    if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ApiError"] && err.status === 401) {
                        setUser(null);
                    } else {
                        setAuthError(err instanceof Error ? err.message : "Không thể xác minh phiên đăng nhập.");
                    }
                }
            } finally{
                if (active) setChecking(false);
            }
        })();
        return ()=>{
            active = false;
        };
    }, [
        setUser
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (checking || !user || !intendedDestination) return;
        if (user.roleId === "CUSTOMER" && intendedDestination === "request-create") {
            navigate(intendedDestination);
        } else {
            navigate("dashboard");
        }
        setIntendedDestination(null);
    }, [
        checking,
        intendedDestination,
        navigate,
        setIntendedDestination,
        user
    ]);
    if (checking) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex min-h-screen flex-col items-center justify-center bg-background",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$app$2f$empty$2d$state$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LoadingState"], {
                className: "py-0"
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 71,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 70,
            columnNumber: 7
        }, this);
    }
    if (authError) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$app$2f$empty$2d$state$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ErrorState"], {
        message: authError
    }, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 76,
        columnNumber: 25
    }, this);
    if (!user) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$public$2f$public$2d$site$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PublicSite"], {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 77,
        columnNumber: 21
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$app$2f$app$2d$shell$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AppShell"], {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 79,
        columnNumber: 10
    }, this);
}
}),
"[project]/src/hooks/use-keyboard-shortcuts.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useKeyboardShortcuts",
    ()=>useKeyboardShortcuts
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$app$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/app-store.ts [app-ssr] (ecmascript)");
"use client";
;
;
function useKeyboardShortcuts() {
    const { user, navigate } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$app$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAppStore"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!user) return;
        let lastKey = "";
        let lastKeyTime = 0;
        const DOUBLE_KEY_TIMEOUT = 600;
        const handler = (e)=>{
            // Don't trigger when typing in inputs, textareas, or contenteditable
            const target = e.target;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                return;
            }
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const key = e.key.toLowerCase();
            const now = Date.now();
            const isDoubleKey = lastKey === "g" && now - lastKeyTime < DOUBLE_KEY_TIMEOUT;
            // "n" for new request (customer only)
            if (key === "n" && user.roleId === "CUSTOMER" && !isDoubleKey) {
                e.preventDefault();
                navigate("request-create");
                lastKey = "";
                return;
            }
            // "g" + key sequences
            if (isDoubleKey) {
                const navMap = {
                    d: "dashboard",
                    r: "requests",
                    h: "horses",
                    i: "invoices",
                    n: "notifications",
                    t: "trips"
                };
                const targetView = navMap[key];
                if (targetView) {
                    e.preventDefault();
                    navigate(targetView);
                    lastKey = "";
                    return;
                }
            }
            if (key === "g") {
                lastKey = "g";
                lastKeyTime = now;
            } else {
                lastKey = "";
            }
        };
        document.addEventListener("keydown", handler);
        return ()=>document.removeEventListener("keydown", handler);
    }, [
        user,
        navigate
    ]);
}
}),
"[project]/src/lib/api-client.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ApiError",
    ()=>ApiError,
    "api",
    ()=>api,
    "apiDelete",
    ()=>apiDelete,
    "apiDownloadFile",
    ()=>apiDownloadFile,
    "apiGet",
    ()=>apiGet,
    "apiPatch",
    ()=>apiPatch,
    "apiPost",
    ()=>apiPost,
    "apiPostFormData",
    ()=>apiPostFormData,
    "apiPut",
    ()=>apiPut
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$app$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/app-store.ts [app-ssr] (ecmascript)");
;
const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");
class ApiError extends Error {
    status;
    details;
    constructor(message, status, details){
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }
}
function apiUrl(path) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const baseHasApiPrefix = /\/api$/i.test(BASE);
    const pathHasApiPrefix = /^\/api(?:\/|$)/i.test(normalizedPath);
    if (baseHasApiPrefix && pathHasApiPrefix) {
        return `${BASE}${normalizedPath.slice(4)}`;
    }
    if (!baseHasApiPrefix && !pathHasApiPrefix) {
        return `${BASE}/api${normalizedPath}`;
    }
    return `${BASE}${normalizedPath}`;
}
function errorMessage(data, status) {
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
        const body = data;
        if (typeof body.error === "string" && body.error.trim()) return body.error;
        if (typeof body.message === "string" && body.message.trim()) return body.message;
    }
    return `Lỗi ${status}`;
}
function clearSessionOnUnauthorized(status) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
}
function getStoredToken() {
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
}
async function api(path, options) {
    const headers = new Headers(options?.headers);
    const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (options?.body != null && !isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (("TURBOPACK compile-time value", "undefined") !== "undefined" && !headers.has("Authorization")) //TURBOPACK unreachable
    ;
    const response = await fetch(apiUrl(path), {
        ...options,
        headers
    });
    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch  {
            data = text;
        }
    }
    if (!response.ok) {
        clearSessionOnUnauthorized(response.status);
        throw new ApiError(errorMessage(data, response.status), response.status, data);
    }
    return data;
}
async function apiDownloadFile(path, fileName) {
    const headers = new Headers({
        Accept: "application/octet-stream"
    });
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const response = await fetch(apiUrl(path), {
        headers
    });
    if (!response.ok) {
        const text = await response.text();
        let data = text;
        try {
            data = text ? JSON.parse(text) : null;
        } catch  {
            data = text;
        }
        clearSessionOnUnauthorized(response.status);
        throw new ApiError(errorMessage(data, response.status), response.status, data);
    }
    if (typeof document === "undefined") {
        throw new Error("Tải tệp chỉ khả dụng trên trình duyệt.");
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
const apiGet = (path)=>api(path);
const apiPost = (path, body)=>api(path, {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body)
    });
const apiPostFormData = (path, body)=>api(path, {
        method: "POST",
        body
    });
const apiPut = (path, body)=>api(path, {
        method: "PUT",
        body: body === undefined ? undefined : JSON.stringify(body)
    });
const apiPatch = (path, body)=>api(path, {
        method: "PATCH",
        body: body === undefined ? undefined : JSON.stringify(body)
    });
const apiDelete = (path)=>api(path, {
        method: "DELETE"
    });
}),
"[project]/src/lib/constants.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Shared business constants for EQUIDELI
__turbopack_context__.s([
    "CURRENCIES",
    ()=>CURRENCIES,
    "DOC_STATUS",
    ()=>DOC_STATUS,
    "INCIDENT_STATUS",
    ()=>INCIDENT_STATUS,
    "INSPECTION_STATUS",
    ()=>INSPECTION_STATUS,
    "PLAN_STATUS",
    ()=>PLAN_STATUS,
    "REQUEST_STATUS",
    ()=>REQUEST_STATUS,
    "REQUEST_STATUS_FLOW",
    ()=>REQUEST_STATUS_FLOW,
    "ROLES",
    ()=>ROLES,
    "ROLE_ICONS",
    ()=>ROLE_ICONS,
    "ROLE_LABELS",
    ()=>ROLE_LABELS,
    "STOP_TYPES",
    ()=>STOP_TYPES,
    "evaluateDeadline",
    ()=>evaluateDeadline,
    "formatDate",
    ()=>formatDate,
    "formatDateTime",
    ()=>formatDateTime,
    "formatMoney",
    ()=>formatMoney,
    "formatUSD",
    ()=>formatUSD,
    "formatUSDCompact",
    ()=>formatUSDCompact,
    "inspectionStatusLabel",
    ()=>inspectionStatusLabel,
    "statusTone",
    ()=>statusTone,
    "transportRequestStatusLabel",
    ()=>transportRequestStatusLabel
]);
const ROLES = {
    ADMIN: "ADMIN",
    CUSTOMER: "CUSTOMER",
    LOGISTICS_MANAGER: "LOGISTICS_MANAGER",
    TRANSPORT_SPECIALIST: "TRANSPORT_SPECIALIST",
    FLEET_COORDINATOR: "FLEET_COORDINATOR",
    DRIVER_ESCORT: "DRIVER_ESCORT"
};
const ROLE_LABELS = {
    ADMIN: "Quản trị viên",
    CUSTOMER: "Khách hàng",
    LOGISTICS_MANAGER: "Quản lý Logistics",
    TRANSPORT_SPECIALIST: "Chuyên viên Thủ tục & Kiểm dịch",
    FLEET_COORDINATOR: "Điều phối viên Đội xe & Lộ trình",
    DRIVER_ESCORT: "Tài xế / Nhân viên đi kèm"
};
const ROLE_ICONS = {
    ADMIN: "Shield",
    CUSTOMER: "User",
    LOGISTICS_MANAGER: "ShieldCheck",
    TRANSPORT_SPECIALIST: "FileCheck2",
    FLEET_COORDINATOR: "Route",
    DRIVER_ESCORT: "Truck"
};
const REQUEST_STATUS = {
    DRAFT: "Nháp",
    SUBMITTED: "Đã gửi",
    UNDER_REVIEW: "Đang thẩm định",
    RETURNED: "Trả lại bổ sung",
    APPROVED: "Đã phê duyệt",
    REJECTED: "Từ chối",
    CANCELLED: "Đã hủy"
};
const REQUEST_STATUS_FLOW = [
    "Nháp",
    "Đã gửi",
    "Đang thẩm định",
    "Trả lại bổ sung",
    "Đã phê duyệt",
    "Từ chối",
    "Đã hủy"
];
function transportRequestStatusLabel(status) {
    switch(status.trim().toLowerCase()){
        case "dang tham dinh":
        case "pending":
            return "Đang thẩm định";
        case "da phe duyet":
        case "approved":
            return "Đã phê duyệt";
        case "tu choi":
        case "rejected":
            return "Từ chối";
        case "da huy":
        case "cancelled":
            return "Đã hủy";
        default:
            return status;
    }
}
function inspectionStatusLabel(status) {
    switch(status.trim().toLowerCase()){
        case "cho xu ly":
        case "pending":
            return "Chờ kiểm tra";
        case "dang xu ly":
        case "processing":
            return "Đang kiểm tra";
        case "yeu cau bo sung ho so":
        case "needs_info":
            return "Cần bổ sung";
        case "da phe duyet":
        case "approved":
            return "Đã phê duyệt";
        case "tu choi":
        case "rejected":
            return "Từ chối";
        default:
            return status;
    }
}
const DOC_STATUS = {
    PENDING: "Chờ nộp",
    SUBMITTED: "Đã nộp",
    REVIEWING: "Đang kiểm tra",
    NEED_MORE: "Cần bổ sung",
    APPROVED: "Đã chấp thuận",
    EXPIRED: "Hết hạn"
};
const INSPECTION_STATUS = {
    PENDING: "Chờ kiểm tra",
    REVIEWING: "Đang kiểm tra",
    NEED_MORE: "Cần bổ sung",
    APPROVED: "Đã phê duyệt",
    REJECTED: "Từ chối"
};
const PLAN_STATUS = {
    PLANNING: "Đang lập kế hoạch",
    READY: "Sẵn sàng",
    IN_PROGRESS: "Đang thực hiện",
    COMPLETED: "Hoàn thành",
    PAUSED: "Tạm dừng"
};
const INCIDENT_STATUS = {
    NEW: "Mới",
    HANDLING: "Đang xử lý",
    RESOLVED: "Đã giải quyết",
    COST_APPROVED: "Đã phê duyệt chi phí"
};
const STOP_TYPES = {
    ORIGIN: "Điểm xuất phát",
    TRANSIT: "Trung chuyển",
    CUSTOMS: "Thông quan",
    QUARANTINE: "Kiểm dịch",
    REST: "Nghỉ dưỡng",
    REFUEL: "Tiếp nhiên liệu",
    DESTINATION: "Điểm đến"
};
function statusTone(status) {
    const s = status.toLowerCase();
    if ([
        "đã phê duyệt",
        "da phe duyet",
        "approved",
        "đã chấp thuận",
        "hoàn thành",
        "completed",
        "sẵn sàng",
        "ready",
        "đã giải quyết",
        "đã thanh toán",
        "paid",
        "đã xác nhận",
        "tốt"
    ].some((k)=>s.includes(k))) return "success";
    if ([
        "đang thẩm định",
        "dang tham dinh",
        "pending",
        "đang kiểm tra",
        "dang xu ly",
        "đang lập kế hoạch",
        "dang lap ke hoach",
        "planning",
        "đang thực hiện",
        "in_progress",
        "đang xử lý",
        "đang vận hành",
        "chờ nộp",
        "chờ kiểm tra",
        "cho xu ly",
        "chờ xác nhận",
        "mới",
        "đã gửi",
        "đã nộp",
        "hơi kém",
        "chưa đến"
    ].some((k)=>s.includes(k))) return "info";
    if ([
        "trả lại",
        "cần bổ sung",
        "yeu cau bo sung",
        "needs_info",
        "tạm dừng",
        "paused",
        "chưa thanh toán",
        "unpaid",
        "hơi kích động",
        "hơi kém"
    ].some((k)=>s.includes(k))) return "warning";
    if ([
        "từ chối",
        "tu choi",
        "rejected",
        "đã hủy",
        "da huy",
        "cancelled",
        "hết hạn",
        "expired",
        "sos"
    ].some((k)=>s.includes(k))) return "danger";
    return "neutral";
}
const CURRENCIES = {
    VND: "₫",
    JPY: "¥",
    USD: "$",
    EUR: "€"
};
function formatMoney(amount, currency = "USD") {
    if (amount == null) return "—";
    // USD format: USD 1,150.00
    if (currency === "USD") {
        return `USD ${amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
    const symbol = CURRENCIES[currency] || "";
    return `${symbol}${amount.toLocaleString("vi-VN")}`;
}
function formatUSD(amount) {
    if (amount == null) return "—";
    return amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
function formatUSDCompact(amount) {
    if (amount == null) return "—";
    return `USD ${amount.toLocaleString("en-US", {
        maximumFractionDigits: 2
    })}`;
}
function evaluateDeadline(eta, deadline, hasTimezone) {
    if (!eta || !deadline) {
        return {
            status: "Chưa đủ dữ liệu đánh giá",
            delayHours: null,
            description: "Thiếu ETA hoặc deadline để đánh giá"
        };
    }
    if (!hasTimezone) {
        return {
            status: "Chưa đủ dữ liệu đánh giá",
            delayHours: null,
            description: "Thiếu múi giờ deadline — không thể đánh giá chính xác"
        };
    }
    const etaDate = typeof eta === "string" ? new Date(eta) : eta;
    const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
    const diffMs = etaDate.getTime() - deadlineDate.getTime();
    const delayHours = Math.round(diffMs / (1000 * 60 * 60));
    if (delayHours <= 0) {
        return {
            status: "Đúng kế hoạch",
            delayHours: 0,
            description: `ETA (${formatDateTime(etaDate)}) không muộn hơn deadline (${formatDateTime(deadlineDate)})`
        };
    }
    if (delayHours <= 24) {
        return {
            status: "Có nguy cơ trễ",
            delayHours,
            description: `ETA muộn hơn deadline ${delayHours} giờ — có thể xử lý theo phương án thay thế`
        };
    }
    return {
        status: "Không đáp ứng deadline",
        delayHours,
        description: `ETA muộn hơn deadline ${delayHours} giờ — cần thay đổi phương án hoặc điều chỉnh lịch trình`
    };
}
function formatDate(date) {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}
function formatDateTime(date) {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}
}),
"[project]/src/lib/csv-export.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// CSV export utility for EQUIDELI
__turbopack_context__.s([
    "exportToCSV",
    ()=>exportToCSV
]);
function exportToCSV(filename, headers, rows) {
    const escapeCsv = (val)=>{
        if (val == null) return "";
        const s = String(val);
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const csvContent = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row)=>row.map(escapeCsv).join(","))
    ].join("\n");
    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob([
        "\uFEFF" + csvContent
    ], {
        type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}
}),
"[project]/src/lib/request-document-constants.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MAX_REQUEST_DOCUMENT_COUNT",
    ()=>MAX_REQUEST_DOCUMENT_COUNT,
    "MAX_REQUEST_DOCUMENT_SIZE",
    ()=>MAX_REQUEST_DOCUMENT_SIZE,
    "MAX_REQUEST_DOCUMENT_TOTAL_SIZE",
    ()=>MAX_REQUEST_DOCUMENT_TOTAL_SIZE,
    "REQUEST_DOCUMENT_EXTENSIONS",
    ()=>REQUEST_DOCUMENT_EXTENSIONS
]);
const MAX_REQUEST_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_REQUEST_DOCUMENT_COUNT = 10;
const MAX_REQUEST_DOCUMENT_TOTAL_SIZE = 50 * 1024 * 1024;
const REQUEST_DOCUMENT_EXTENSIONS = [
    ".pdf",
    ".doc",
    ".docx",
    ".jpg",
    ".jpeg",
    ".png"
];
}),
"[project]/src/store/app-store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAppStore",
    ()=>useAppStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/middleware.mjs [app-ssr] (ecmascript)");
;
;
const useAppStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])()((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["persist"])((set)=>({
        user: null,
        setUser: (u)=>set({
                user: u
            }),
        view: "dashboard",
        params: {},
        navigate: (view, params = {})=>{
            set({
                view,
                params
            });
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
        },
        publicView: "home",
        navigatePublic: (publicView)=>{
            set({
                publicView
            });
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
        },
        intendedDestination: null,
        setIntendedDestination: (view)=>set({
                intendedDestination: view
            }),
        sidebarOpen: true,
        setSidebarOpen: (open)=>set({
                sidebarOpen: open
            })
    }), {
    name: "equideli-app",
    partialize: (state)=>({
            user: state.user,
            view: state.view,
            params: state.params,
            sidebarOpen: state.sidebarOpen
        })
}));
}),
];})()

//# sourceMappingURL=src_11eu46ge808x6._.js.map