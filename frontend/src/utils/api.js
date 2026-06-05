/**
 * API Client - Axios with JWT auto-refresh
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh });
        localStorage.setItem('access_token', data.access);
        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/admin';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  me: () => api.get('/auth/me/'),
  updateProfile: (data) => api.patch('/auth/me/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  dashboardStats: () => api.get('/auth/dashboard/stats/'),
};

// Courses (plantillas)
export const coursesAPI = {
  list: () => api.get('/courses/'),
  get: (id) => api.get(`/courses/${id}/`),
  create: (data) => api.post('/courses/', data),
  update: (id, data) => api.patch(`/courses/${id}/`, data),
  delete: (id) => api.delete(`/courses/${id}/`),
  toggleActive: (id, activo) => api.patch(`/courses/${id}/toggle_active/`, { activo }),
  registrations: (id, nombreCurso) => {
    const params = nombreCurso ? `?nombre_curso=${encodeURIComponent(nombreCurso)}` : '';
    return api.get(`/courses/${id}/registrations/${params}`);
  },
  statistics: (id, nombreCurso) => {
    const params = nombreCurso ? `?nombre_curso=${encodeURIComponent(nombreCurso)}` : '';
    return api.get(`/courses/${id}/statistics/${params}`);
  },
  courseNames: (id) => api.get(`/courses/${id}/course_names/`),
  adminStats: () => api.get('/courses/admin-stats/'),
  statsByName: (nombre) => api.get(`/courses/stats-by-name/${encodeURIComponent(nombre)}/`),
  publicReportByName: (nombre) => `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/courses/public-report-name/${encodeURIComponent(nombre)}/`,
  deleteRegistrationsByCourse: (nombreCurso) =>
    api.delete(`/courses/registrations-by-course/${encodeURIComponent(nombreCurso)}/`),

  registrationsByCourse: (nombreCurso) =>
    api.get(`/courses/registrations-by-course/${encodeURIComponent(nombreCurso)}/`),

  toggleCompletado: (regId) =>
    api.patch(`/courses/registrations/${regId}/toggle-completado/`),

  sendDiploma: (regId, formData) =>
    api.post(`/courses/registrations/${regId}/send-diploma/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

};

// Form Fields
export const fieldsAPI = {
  list: (courseId) => api.get(`/courses/${courseId}/form-fields/`),
  create: (courseId, data) => api.post(`/courses/${courseId}/form-fields/`, data),
  update: (courseId, fieldId, data) => api.patch(`/courses/${courseId}/form-fields/${fieldId}/`, data),
  delete: (courseId, fieldId) => api.delete(`/courses/${courseId}/form-fields/${fieldId}/`),
};

// Registrations
export const registrationsAPI = {
  markCompleted: (id, completado) =>
    api.patch(`/courses/registrations/${id}/`, { completado }),
  uploadDiploma: (id, file) => {
    const form = new FormData();
    form.append('archivo', file);
    return api.post(`/diplomas/${id}/upload/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Public (no auth)
export const publicAPI = {
  getForm: (qrToken) =>
    axios.get(`${API_BASE}/courses/inscripcion/${qrToken}/`),
  submitForm: (qrToken, data) =>
    axios.post(`${API_BASE}/courses/inscripcion/${qrToken}/`, data),
};
