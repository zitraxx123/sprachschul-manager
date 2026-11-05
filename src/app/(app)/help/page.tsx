import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HelpCenterView } from "@/components/help/help-center-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  return {
    title: `${t("title")} • Klasswerk`,
    description: t("metaDescription"),
  };
}

export default function HelpPage() {
  return <HelpCenterView />;
}
