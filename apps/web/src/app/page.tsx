"use client";

import { useCallback, useEffect, useState } from "react";
import type { View } from "../components/ohmflow-types";
import { WorkspaceViews } from "../components/ohmflow-workspace";
import { TicketDetailView } from "../components/ohmflow-ticket-detail";
import { AppShell } from "../components/ohmflow-shell";
import { api, dateShort, Empty, initials, labels, roleNames, Status } from "../components/ohmflow-ui";
import { LoginScreen } from "../components/ohmflow-login";
import { buildMetricCards, buildNavigation, pageTitles } from "../components/ohmflow-dashboard-config";
import { errorMessage } from "../lib/api";
import { useAuth } from "../hooks/use-auth";
import { useFeedback } from "../hooks/use-feedback";
import { useDashboard } from "../hooks/use-dashboard";
import { useTicketList } from "../hooks/use-ticket-list";
import { useTicketOptions } from "../hooks/use-ticket-options";
import { useTicketDetail } from "../hooks/use-ticket-detail";
import { useAgentOptions } from "../hooks/use-agent-options";
import { useCreateTicket } from "../hooks/use-create-ticket";

export default function Home() {
  const auth = useAuth();
  const user = auth.user;
  const [view, setView] = useState<View>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);

  const feedback = useFeedback();
  const { setError } = feedback;
  const dashboard = useDashboard(user?.id, setError);
  const list = useTicketList(user?.id, view, setError);
  const options = useTicketOptions();

  const { reload: reloadDashboard } = dashboard;
  const { reload: reloadList } = list;
  const refreshLists = useCallback(async () => {
    setError("");
    try {
      await Promise.all([reloadDashboard(), reloadList()]);
    } catch (e) {
      setError(errorMessage(e, "Impossible de charger les données"));
    }
  }, [reloadDashboard, reloadList, setError]);

  const ticket = useTicketDetail(feedback, options, refreshLists);
  const agents = useAgentOptions(user?.role === "ADMIN", ticket.detail?.id, ticket.detail?.cellId);
  const creation = useCreateTicket(feedback, async () => {
    setView("tickets");
    await refreshLists();
  });

  // Les listes de choix du formulaire de création sont chargées à l'ouverture de la vue.
  const { load: loadOptions } = options;
  useEffect(() => {
    if (!user || view !== "new") return;
    loadOptions().catch((e: unknown) =>
      setError(errorMessage(e, "Chargement des cellules, catégories et GRD impossible")),
    );
  }, [user, view, loadOptions, setError]);

  if (auth.loading)
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#728078" }}>
        <div style={{ width: 220 }}>
          <div className="skeleton" />
          <div style={{ height: 8 }} />
          <div className="skeleton" style={{ width: "70%" }} />
        </div>
      </div>
    );
  if (!user)
    return (
      <LoginScreen
        error={auth.error}
        busy={auth.busy}
        loginForm={auth.loginForm}
        onLogin={auth.login}
        showPassword={auth.showPassword}
        setShowPassword={auth.setShowPassword}
      />
    );

  const navClick = (next: View) => {
    setView(next);
    list.setPage(1);
    ticket.closeTicket();
    feedback.clear();
    setMobileNav(false);
  };
  const logout = async () => {
    await auth.logout();
    ticket.closeTicket();
    setView("dashboard");
  };

  const { detail } = ticket;
  const userName = `${user.firstName} ${user.lastName}`;
  const heading = detail ? detail.reference : pageTitles[view];

  return (
    <AppShell
      {...{ user, userName, view, detail, mobileNav, setMobileNav, logout, heading, navClick }}
      nav={buildNavigation(user.role, dashboard.metrics)}
    >
      <section className="workspace fade-in">
        {feedback.error && <div className="error-banner">{feedback.error}</div>}
        {feedback.success && <div className="success-banner">{feedback.success}</div>}
        <WorkspaceViews
          api={api}
          user={user}
          view={view}
          detail={detail}
          metrics={dashboard.metrics}
          recent={dashboard.recent}
          tickets={list.tickets}
          shownTickets={list.tickets}
          total={list.total}
          page={list.page}
          setPage={list.setPage}
          search={list.search}
          setSearch={list.changeSearch}
          statusFilter={list.statusFilter}
          setStatusFilter={list.changeStatusFilter}
          navClick={navClick}
          openTicket={ticket.openTicket}
          ticketForm={creation.ticketForm}
          createTicket={creation.createTicket}
          busy={feedback.busy}
          ticketCategories={options.categories}
          ticketCells={options.cells}
          ticketGrds={options.grds}
          userName={userName}
          metricCards={buildMetricCards(user.role, dashboard.metrics)}
          {...{ roleNames, initials, labels, Status, Empty }}
        />
        {detail && (
          <TicketDetailView
            user={user}
            detail={detail}
            setDetail={ticket.setDetail}
            setView={setView}
            busy={feedback.busy}
            ticketCanBeEdited={ticket.canEdit(user.id)}
            ticketEditMode={ticket.ticketEditMode}
            setTicketEditMode={ticket.setTicketEditMode}
            ticketEditOptionsLoading={options.loading}
            ticketEditForm={ticket.ticketEditForm}
            setTicketEditForm={ticket.setTicketEditForm}
            ticketCells={options.cells}
            ticketCategories={options.categories}
            ticketGrds={options.grds}
            saveTicketEdit={ticket.saveTicketEdit}
            beginTicketEdit={ticket.beginTicketEdit}
            claimTicket={ticket.claimTicket}
            changeStatus={ticket.changeStatus}
            comment={ticket.comment}
            setComment={ticket.setComment}
            addComment={ticket.addComment}
            agentsLoading={agents.loading}
            eligibleAgents={agents.eligibleAgents}
            agentsLoadError={agents.error}
            selectedAgent={ticket.selectedAgent}
            setSelectedAgent={ticket.setSelectedAgent}
            assignTicket={ticket.assignTicket}
            {...{ labels, Status, dateShort }}
          />
        )}
      </section>
    </AppShell>
  );
}
