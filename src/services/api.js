
const API_BASE = 'http://localhost:5000/api'

// Helper for requests
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token')
  const headers = {
    ...options.headers,
  }

  // Only set application/json if not sending FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Important for sending session cookies
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'API request failed')
  }

  return data
}

// Auth API
export const handleLogin = async (credentials) => {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export const handleSignup = async (userData) => {
  return request('/signup', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

export const requestPasswordReset = async (email) => {
  return request('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export const resetPassword = async ({ token, password }) => {
  return request('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export const forcePasswordChange = async (newPassword) => {
  return request('/auth/force-change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  })
}

export const startGoogleOAuth = () => {
  window.location.href = `${API_BASE}/google/start`
}

// User API
export const getAccountProfile = async () => {
  return await request('/account/profile')
}

export const updateAccountProfile = async (profileData) => {
  return request('/account/profile', {
    method: 'POST', // user_account.py uses POST for upsert
    body: JSON.stringify(profileData),
  })
}

// Admin API
export const fetchAdmins = async () => {
  return request('/admin/admins')
}

export const addAdmin = async (adminData) => {
  return request('/admin/admins/single', {
    method: 'POST',
    body: JSON.stringify(adminData)
  })
}

export const toggleAdminRetire = async (id) => {
  return request(`/admin/admins/${id}/retire`, {
    method: 'PUT'
  })
}

export const makeAdminDefault = async (id) => {
  return request(`/admin/admins/${id}/default`, {
    method: 'PUT'
  })
}

export const fetchAdminStats = async () => {
  return request('/admin/stats')
}

export const getFaculties = async () => {
  return request('/admin/faculties')
}

export const addFaculty = async (facultyData) => {
  return request('/admin/faculties', {
    method: 'POST',
    body: JSON.stringify(facultyData)
  })
}

export const deleteFaculty = async (id) => {
  return request(`/admin/faculties/${id}`, {
    method: 'DELETE'
  })
}

export const resetFacultyPassword = async (id) => {
  return request(`/admin/faculties/${id}/reset-password`, {
    method: 'POST'
  })
}

export const batchUploadFaculty = async (formData) => {
  return request('/admin/faculties/batch', {
    method: 'POST',
    body: formData
  })
}

export const getStudents = async () => {
  return request('/admin/students')
}

export const addSingleStudent = async (studentData) => {
  return request('/admin/students/single', {
    method: 'POST',
    body: JSON.stringify(studentData)
  })
}

export const batchUploadStudents = async (formData) => {
  return request('/admin/students/batch', {
    method: 'POST',
    body: formData
  })
}

export const resetStudentPassword = async (studentId) => {
  return request(`/admin/students/${studentId}/reset-password`, {
    method: 'POST'
  })
}

// --- DEPARTMENTS ---

export const getDepartments = async () => {
  return request('/admin/departments')
}

export const renameDepartment = async (oldName, newName) => {
  return request(`/admin/departments/${encodeURIComponent(oldName)}`, {
    method: 'PUT',
    body: JSON.stringify({ new_name: newName })
  })
}

// --- COURSES ---

export const getCourses = async () => {
  return request('/admin/courses')
}

export const addCourse = async (courseData) => {
  return request('/admin/courses', {
    method: 'POST',
    body: JSON.stringify(courseData)
  })
}

export const updateCourse = async (courseId, courseData) => {
  return request(`/admin/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(courseData)
  })
}

export const deleteCourse = async (courseId) => {
  return request(`/admin/courses/${courseId}`, {
    method: 'DELETE'
  })
}
