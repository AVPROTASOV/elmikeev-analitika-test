import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL as string
const key = import.meta.env.VITE_API_KEY as string

export const http = axios.create({
  baseURL,
  timeout: 20000,
  params: { key }, // ключ уходит всегда
})

// Если надо: обработка ошибок глобально
http.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error('API error:', err?.response?.data || err.message)
    return Promise.reject(err)
  }
)
