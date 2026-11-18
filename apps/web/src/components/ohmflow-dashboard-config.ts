import {
  Activity,
  BriefcaseBusiness,
  Check,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  TicketCheck,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import type { Role, TicketStatus } from "@ohmflow/shared";
import type { Metrics, View } from "./ohmflow-types";

export function buildNavigation(role: Role, metrics: Metrics | null) {
  return [
    {
      id: "dashboard" as const,
      label: "Vue d’ensemble",
      icon: LayoutDashboard,
      section: "ESPACE",
    },
    {
      id: "tickets" as const,
      label: "Tous les tickets",
      icon: ClipboardList,
      section: "ESPACE",
      count: metrics?.open,
    },
    ...(role === "AGENT" || role === "ADMIN"
      ? [{ id: "agents" as const, label: "File de traitement", icon: TicketCheck, section: "TRAITEMENT", count: metrics?.unassigned }]
      : []),
    ...(role === "ADMIN"
      ? [
          { id: "users" as const, label: "Utilisateurs", icon: Users, section: "ADMINISTRATION" },
          { id: "services" as const, label: "Services & cellules", icon: BriefcaseBusiness, section: "ADMINISTRATION" },
          { id: "categories" as const, label: "Catégories de tickets", icon: ClipboardList, section: "ADMINISTRATION" },
          { id: "grds" as const, label: "GRD", icon: Zap, section: "ADMINISTRATION" },
        ]
      : []),
    { id: "profile" as const, label: "Mon profil", icon: UserRound, section: "COMPTE" },
  ];
}

export const pageTitles: Record<View, string> = {
  dashboard: "Vue d’ensemble",
  tickets: "Tous les tickets",
  new: "Nouvelle demande",
  agents: "File de traitement",
  users: "Utilisateurs",
  services: "Services & cellules",
  categories: "Catégories de tickets",
  grds: "Gestionnaires de réseau (GRD)",
  profile: "Mon profil",
};

export function buildMetricCards(role: Role, metrics: Metrics | null) {
  return role === "USER"
    ? [
        { label: "Tickets de ma cellule", value: metrics?.total ?? 0, note: "Toutes les demandes de l’équipe", icon: ClipboardList },
        { label: "À traiter", value: metrics?.open ?? 0, note: "En attente de prise en charge", icon: Clock3 },
        { label: "En cours", value: metrics?.inProgress ?? 0, note: "Traitement actif", icon: Activity },
        { label: "Résolus", value: metrics?.resolved ?? 0, note: "Demandes terminées", icon: Check },
      ]
    : [
        { label: "Tickets visibles", value: metrics?.total ?? 0, note: role === "ADMIN" ? "Toutes les cellules" : "Dans votre périmètre", icon: ClipboardList },
        { label: "Non attribués", value: metrics?.unassigned ?? 0, note: "Prêts à être pris en charge", icon: UserRound },
        { label: "En traitement", value: metrics?.inProgress ?? 0, note: "Tickets en cours", icon: Activity },
        { label: "En attente", value: metrics?.waiting ?? 0, note: role === "ADMIN" ? `${metrics?.activeUsers ?? 0} comptes actifs` : "Informations attendues", icon: Clock3 },
      ];
}

export function availableStatuses(status: TicketStatus, role: Role): TicketStatus[] {
  if (role === "AGENT") {
    if (status === "IN_PROGRESS") return ["WAITING", "RESOLVED"];
    if (status === "WAITING") return ["IN_PROGRESS", "RESOLVED", "OPEN"];
    if (status === "RESOLVED") return ["CLOSED", "IN_PROGRESS"];
    if (status === "CLOSED") return ["IN_PROGRESS"];
    return ["IN_PROGRESS"];
  }
  if (status === "OPEN") return ["IN_PROGRESS"];
  if (status === "IN_PROGRESS") return ["WAITING", "RESOLVED", "OPEN"];
  if (status === "WAITING") return ["IN_PROGRESS", "RESOLVED", "OPEN"];
  return ["CLOSED", "IN_PROGRESS"];
}
