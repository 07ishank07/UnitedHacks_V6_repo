import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests if available
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  register: (userData) => axiosInstance.post('/auth/register', userData),
  login: (credentials) => axiosInstance.post('/auth/login', credentials),
  getCurrentUser: () => axiosInstance.get('/auth/me'),
  updateProfile: (profileData) => axiosInstance.put('/auth/me', profileData),

  // Legacy Users (deprecated)
  createUser: (userData) => axiosInstance.post('/users/', userData),
  getUser: (userId) => axiosInstance.get(`/users/${userId}`),
  searchUsers: (query) => axiosInstance.get('/users/', { params: { q: query } }),
  getUserPersonality: (userId) => axiosInstance.get(`/users/${userId}/personality`),
  getUserLifeAreas: (userId) => axiosInstance.get(`/users/${userId}/life-areas`),
  getUserDecisions: (userId, limit = 20, offset = 0) => 
    axiosInstance.get(`/users/${userId}/decisions`, { params: { limit, offset } }),
  getFollowing: (userId) => axiosInstance.get(`/users/${userId}/following`),
  getFollowers: (userId) => axiosInstance.get(`/users/${userId}/followers`),
  followUser: (followerId, followingId) => 
    axiosInstance.post(`/users/${followerId}/follow/${followingId}`),
  unfollowUser: (followerId, followingId) => 
    axiosInstance.delete(`/users/${followerId}/follow/${followingId}`),

  // Decisions
  createDecision: (decisionData) => axiosInstance.post('/decisions/', decisionData),
  getDecisions: (params = {}) => axiosInstance.get('/decisions/', { params }),
  getDecision: (id) => axiosInstance.get(`/decisions/${id}`),
  deleteDecision: (id) => axiosInstance.delete(`/decisions/${id}`),
  getConsensusRecommendation: (decisionText) => axiosInstance.get(`/decisions/recommend/${encodeURIComponent(decisionText)}`),

  // Votes
  createVote: (voteData) => axiosInstance.post('/votes/', voteData),
  deleteVote: (decisionId) => axiosInstance.delete(`/votes/${decisionId}`),
  getVoteCounts: (decisionId) => axiosInstance.get(`/votes/${decisionId}`),

  // Comments
  createComment: (commentData) => axiosInstance.post('/comments/', commentData),
  getComments: (decisionId, params = {}) => axiosInstance.get(`/comments/${decisionId}`, { params }),
  deleteComment: (commentId) => axiosInstance.delete(`/comments/${commentId}`),
  likeComment: (commentId) => axiosInstance.post(`/comments/${commentId}/like`),
  unlikeComment: (commentId) => axiosInstance.delete(`/comments/${commentId}/like`),

  // Leaderboard
  getLeaderboard: () => axiosInstance.get('/leaderboard/'),

  // About
  getAbout: () => axiosInstance.get('/about/')
};
