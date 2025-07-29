import axios from 'axios';

// Create an axios instance with base configuration
const api = axios.create({
  baseURL: '/api', // Will be proxied to http://localhost:4000 in development
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
