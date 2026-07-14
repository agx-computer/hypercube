"use client"

import { createAuthClient } from "better-auth/react"
import { apiKeyClient } from "@better-auth/api-key/client"
import { API_URL } from "./api"

export const authClient = createAuthClient({
  baseURL: `${API_URL}/auth`,
  fetchOptions: { credentials: "include" },
  plugins: [apiKeyClient()],
})
