import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auth endpoints intentionally return 401 for bad credentials — that's a normal
// rejected login, not an expired session, so it must NOT trigger the global
// logout+redirect below (which would wipe the page before any error can show).
const isAuthRequest = (config) => /\/auth\/(login|register)/.test(config?.url || '')

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isAuthRequest(error.config)) {
      // Dynamic import avoids a static circular import (useAuthStore imports this module for its API calls).
      const { default: useAuthStore } = await import('../store/useAuthStore')
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
