import React from "react";
import { createRoot } from "react-dom/client";
import App from "./finanzas.jsx";

/* Adaptador: fuera de claude.ai no existe window.storage,
   así que se emula con localStorage (los datos quedan en tu dispositivo). */
if (!window.storage) {
  const P = "finanzas:";
  window.storage = {
    async get(key) {
      const v = localStorage.getItem(P + key);
      if (v === null) throw new Error("Key not found: " + key);
      return { key, value: v, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(P + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      localStorage.removeItem(P + key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(P + prefix)) keys.push(k.slice(P.length));
      }
      return { keys, prefix, shared: false };
    },
  };
}

createRoot(document.getElementById("root")).render(<App />);
