import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useTranslation } from "@/contexts/LanguageContext";

export function Toaster() {
  const { toasts } = useToast();
  const { t } = useTranslation();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose aria-label={t('common.close')} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
