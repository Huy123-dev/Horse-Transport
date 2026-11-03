"use client";

import { useEffect, useRef } from "react";

const GSI_SRC = "https://accounts.google.com/gsi/client";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        ux_mode?: "popup" | "redirect";
      }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let gsiPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiPromise = null;
      reject(new Error("Không tải được thư viện đăng nhập Google."));
    };
    document.head.appendChild(script);
  });
  return gsiPromise;
}

interface GoogleSignInButtonProps {
  /** Nhận Google ID token (JWT) sau khi người dùng chọn tài khoản Google. */
  onCredential: (idToken: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({ onCredential, onError, disabled }: GoogleSignInButtonProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: "popup",
          callback: (response) => {
            if (response.credential) onCredentialRef.current(response.credential);
            else onErrorRef.current?.("Google không trả về thông tin đăng nhập.");
          },
        });
        container.innerHTML = "";
        window.google.accounts.id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
          locale: "vi",
          width: Math.min(400, Math.max(200, container.offsetWidth || 320)),
        });
      })
      .catch((err: unknown) => {
        onErrorRef.current?.(err instanceof Error ? err.message : "Không tải được đăng nhập Google.");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // Chưa cấu hình Client ID -> ẩn nút (không làm hỏng form đăng nhập thường)
  if (!clientId) return null;

  return (
    <div
      ref={containerRef}
      className={`flex w-full justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
      aria-busy={disabled}
    />
  );
}
