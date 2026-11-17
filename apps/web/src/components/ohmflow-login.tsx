"use client";

import type { UseFormReturn } from "react-hook-form";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Brand } from "./ohmflow-ui";

type LoginValues = { email: string; password: string };

type LoginScreenProps = {
  error: string;
  busy: boolean;
  loginForm: UseFormReturn<LoginValues>;
  onLogin: (values: LoginValues) => void | Promise<void>;
  showPassword: boolean;
  setShowPassword: (visible: boolean) => void;
};

export function LoginScreen({
  error,
  busy,
  loginForm,
  onLogin,
  showPassword,
  setShowPassword,
}: LoginScreenProps) {
  return (
    <main className="login-shell">
      <section className="login-art">
        <Brand />
        <div className="login-copy">
          <div className="eyebrow" style={{ color: "#b0d7bb" }}>
            OHM ÉNERGIE · SUPPORT INTERNE
          </div>
          <h1>
            Le service
            <br />
            avance ensemble.
          </h1>
          <p>
            Un espace partagé pour suivre les demandes, résoudre les incidents et aider chaque équipe à avancer.
          </p>
        </div>
        <div className="login-foot">
          © Ohm Énergie · Espace réservé aux collaborateurs
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-form">
          <div className="login-brand-small">
            <Brand />
          </div>
          <div className="eyebrow">VOTRE ESPACE DE TRAVAIL</div>
          <h2>Bon retour parmi nous</h2>
          <p>Connectez-vous avec vos identifiants OhmFlow.</p>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={loginForm.handleSubmit(onLogin)}>
            <div className="field">
              <label htmlFor="email">Adresse e-mail</label>
              <input
                id="email"
                className="control"
                autoComplete="username"
                placeholder="prenom.nom@ohm-energie.com"
                {...loginForm.register("email")}
              />
              {loginForm.formState.errors.email && (
                <span className="field-error">
                  {loginForm.formState.errors.email.message}
                </span>
              )}
            </div>
            <div className="field">
              <label htmlFor="password">Mot de passe</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  className="control"
                  style={{ paddingRight: 42 }}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  {...loginForm.register("password")}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#75817b", display: "grid", placeItems: "center", padding: 5 }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <span className="field-error">
                  {loginForm.formState.errors.password.message}
                </span>
              )}
            </div>
            <button className="button button-primary" disabled={busy}>
              {busy ? "Connexion…" : "Se connecter"}
              <ArrowRight size={15} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
