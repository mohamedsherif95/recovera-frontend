import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SessionForm } from "./SessionForm";

export function SessionFormDrawer({
  open,
  onOpenChange,
  title,
  description,
  ...sessionFormProps
}) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
        <SheetHeader className="sr-only">
          <SheetTitle>
            {title ||
              t("sessions.createSession", { defaultValue: "Create visit" })}
          </SheetTitle>
          <SheetDescription>
            {description ||
              t("sessions.createVisitDrawerDescription", {
                defaultValue: "Create a new visit.",
              })}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {open && <SessionForm {...sessionFormProps} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
