
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"

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
    credentials: 'include',
  })

  // Handle non-JSON responses (like Nginx errors)
  const contentType = response.headers.get('content-type')
  let data = {}
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  } else {
    // If not JSON, it's likely an Nginx error page (HTML)
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`Server Error (${response.status}): The backend is unreachable or crashed.`)
    }
    return text // Fallback for plain text success
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `Error ${response.status}: API request failed`)
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

export const updateFaculty = async (id, facultyData) => {
  return request(`/admin/faculties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(facultyData)
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

export const updateStudent = async (studentId, studentData) => {
  return request(`/admin/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(studentData)
  })
}

export const deleteStudent = async (studentId) => {
  return request(`/admin/students/${studentId}`, {
    method: 'DELETE'
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

export const addDepartment = async (name) => {
  return request('/admin/departments', {
    method: 'POST',
    body: JSON.stringify({ name })
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

// --- FACULTY/STUDENT PORTAL ---
export const getFacultySubjects = async () => {
  return request('/dashboard/faculty-subjects')
}

export const getMyCourses = async () => {
  return request('/dashboard/my-courses')
}

export const getDashboardSummary = async () => {
  return request('/dashboard/summary')
}

export const getRiskDistribution = async () => {
  return request('/dashboard/risk-distribution')
}

export const getFacultyProfile = async () => {
  return request('/dashboard/faculty-profile')
}

export const getDashboardStudents = async () => {
  return request('/students')
}

export const runRiskPrediction = async () => {
  return request('/ai/predict', { method: 'POST' })
}

export const importStudents = async (formData) => {
  return request('/students/import', {
    method: 'POST',
    body: formData
  })
}
