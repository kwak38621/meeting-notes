import api from './axios';

export const register = (email, password, name) =>
  api.post('/auth/register', { email, password, name });

export const login = (email, password) =>
  api.post('/auth/login', { email, password });
