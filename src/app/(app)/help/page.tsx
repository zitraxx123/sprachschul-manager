import { Metadata } from "next";
import { HelpCenterView } from "@/components/help/help-center-view";

export const metadata: Metadata = {
  title: "Hilfe & Wissensdatenbank • Sprachschul-Manager",
  description: "Anleitungen und Antworten zu Kursen, Stundenplan, Schülerimport, Anwesenheiten und Honoraren.",
};

export default function HelpPage() {
  return <HelpCenterView />;
}