import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token + tenant slug to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`

  const slug = localStorage.getItem('tenantSlug')
  if (slug) config.headers['X-Tenant-Slug'] = slug

  return config
})

// Auto-refresh on 401
let refreshing = false
let queue = []

const processQueue = (error, token = null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  queue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`
            return api(original)
          })
          .catch((e) => Promise.reject(e))
      }

      original._retry = true
      refreshing = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefresh } = data.data

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', newRefresh)

        processQueue(null, accessToken)
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch (e) {
        processQueue(e, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(e)
      } finally {
        refreshing = false
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: (refreshToken) => api.post('/api/auth/logout', { refreshToken }),
  me: () => api.get('/api/auth/me'),
  refresh: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
}

// ── Tenants ───────────────────────────────────────────────
export const tenantAPI = {
  onboard: (data) => api.post('/api/tenants/onboard', data),
  checkSlug: (slug) => api.get(`/api/tenants/check-slug/${slug}`),
  current: () => api.get('/api/tenants/current'),
}

// ── Dashboard ─────────────────────────────────────────────
export const dashboardAPI = {
  stats: () => api.get('/api/dashboard/stats'),
  users: () => api.get('/api/dashboard/users'),
}

// ── Bookings ──────────────────────────────────────────────
export const bookingAPI = {
  list:         (params) => api.get('/api/bookings', { params }),
  stats:        ()       => api.get('/api/bookings/stats'),
  get:          (id)     => api.get(`/api/bookings/${id}`),
  create:       (data)   => api.post('/api/bookings', data),
  update:       (id, data) => api.put(`/api/bookings/${id}`, data),
  updateStatus: (id, status) => api.patch(`/api/bookings/${id}/status`, { status }),
  delete:       (id)     => api.delete(`/api/bookings/${id}`),
}

export default api
