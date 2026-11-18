"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, errorMessage } from "../lib/api";
import type { User } from "../components/ohmflow-types";

const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(1, "Saisissez votre mot de passe"),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** Session courante : restauration au chargement, connexion et déconnexion. */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then(({ user: current }) => setUser(current))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(values: LoginValues) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setUser(result.user);
    } catch (e) {
      setError(errorMessage(e, "Connexion impossible"));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* La session est également invalidée à son expiration. */
    }
    setUser(null);
  }

  return { user, loading, busy, error, loginForm, login, logout, showPassword, setShowPassword };
}
