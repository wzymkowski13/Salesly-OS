"use client";

import { FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";

type ServerActionResult = void | { ok?: boolean; message?: string; description?: string };

export function ActionForm({
  action,
  successMessage,
  errorMessage = "Nie udało się wykonać akcji.",
  resetOnSuccess = false,
  refreshOnSuccess = true,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ServerActionResult>;
  successMessage: string;
  errorMessage?: string;
  resetOnSuccess?: boolean;
  refreshOnSuccess?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const { pushToast } = useToast();
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result && result.ok === false) throw new Error(result.message || errorMessage);
        pushToast({
          title: result?.message || successMessage,
          description: result?.description,
          tone: "success",
        });
        if (resetOnSuccess) form.reset();
        if (refreshOnSuccess) router.refresh();
      } catch (error) {
        pushToast({
          title: errorMessage,
          description: error instanceof Error ? error.message : "Spróbuj ponownie.",
          tone: "error",
          duration: 6500,
        });
      }
    });
  }

  return <form onSubmit={onSubmit} className={className} aria-busy={pending}>{children}</form>;
}
