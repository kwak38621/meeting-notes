import api from './axios';

export const getPageTree = () => api.get('/pages');
export const getPage = (id) => api.get(`/pages/${id}`);
export const createPage = (data) => api.post('/pages', data);
export const updatePage = (id, data) => api.put(`/pages/${id}`, data);
export const deletePage = (id) => api.delete(`/pages/${id}`);
export const searchPages = (q) => api.get('/pages/search', { params: { q } });
export const movePage = (id, parentId) => api.patch(`/pages/${id}/move`, { parentId });
export const addTag = (pageId, tagId) => api.post(`/pages/${pageId}/tags/${tagId}`);
export const removeTag = (pageId, tagId) => api.delete(`/pages/${pageId}/tags/${tagId}`);
