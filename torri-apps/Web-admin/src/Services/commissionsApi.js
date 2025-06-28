import api from './api';

const API_BASE = '/api/v1/commissions';

export const commissionsApi = {
  /**
   * Get commissions with optional filters
   * @param {Object} params - Query parameters (professional_id, payment_status, date_from, date_to, page, page_size)
   * @returns {Promise<{data: Array, total_count: number}>}
   */
  async getCommissions(params = {}) {
    try {
      // Remove empty parameters
      const cleanParams = Object.keys(params).reduce((acc, key) => {
        if (params[key] !== '' && params[key] != null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});

      const response = await api.get(`${API_BASE}/`, { params: cleanParams });
      
      // Assuming the API returns data directly for now
      // In a real pagination setup, you might get { data, total_count, page, etc. }
      return {
        data: response.data,
        total_count: response.data.length // This would come from pagination headers in real implementation
      };
    } catch (error) {
      console.error('[commissionsApi] Error fetching commissions:', error);
      throw error;
    }
  },

  /**
   * Get commission KPIs for dashboard
   * @param {Object} params - Filter parameters (professional_id, date_from, date_to)
   * @returns {Promise<Object>}
   */
  async getKPIs(params = {}) {
    try {
      const cleanParams = Object.keys(params).reduce((acc, key) => {
        if (params[key] !== '' && params[key] != null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});

      const response = await api.get(`${API_BASE}/kpis`, { params: cleanParams });
      return response.data;
    } catch (error) {
      console.error('[commissionsApi] Error fetching KPIs:', error);
      throw error;
    }
  },

  /**
   * Get a specific commission by ID
   * @param {string} commissionId - Commission ID
   * @returns {Promise<Object>}
   */
  async getCommission(commissionId) {
    try {
      const response = await api.get(`${API_BASE}/${commissionId}`);
      return response.data;
    } catch (error) {
      console.error('[commissionsApi] Error fetching commission:', error);
      throw error;
    }
  },

  /**
   * Update a commission
   * @param {string} commissionId - Commission ID
   * @param {Object} updateData - Update data (adjusted_value, adjustment_reason, payment_status)
   * @returns {Promise<Object>}
   */
  async updateCommission(commissionId, updateData) {
    try {
      const response = await api.patch(`${API_BASE}/${commissionId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('[commissionsApi] Error updating commission:', error);
      throw error;
    }
  },

  /**
   * Create a commission payment (batch payment)
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>}
   */
  async createPayment(paymentData) {
    try {
      const response = await api.post(`${API_BASE}/payments`, paymentData);
      return response.data;
    } catch (error) {
      console.error('[commissionsApi] Error creating payment:', error);
      throw error;
    }
  },

  /**
   * Export commissions to CSV
   * @param {Object} params - Filter parameters
   * @returns {Promise<void>} - Triggers download
   */
  async exportCSV(params = {}) {
    try {
      const cleanParams = Object.keys(params).reduce((acc, key) => {
        if (params[key] !== '' && params[key] != null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});

      const response = await api.get(`${API_BASE}/export/csv`, {
        params: cleanParams,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'comissoes.csv';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[commissionsApi] Error exporting CSV:', error);
      throw error;
    }
  },

  /**
   * Export commissions to PDF
   * @param {Object} params - Filter parameters
   * @returns {Promise<void>} - Triggers download
   */
  async exportPDF(params = {}) {
    try {
      const cleanParams = Object.keys(params).reduce((acc, key) => {
        if (params[key] !== '' && params[key] != null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});

      const response = await api.get(`${API_BASE}/export/pdf`, {
        params: cleanParams,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'relatorio_comissoes.pdf';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[commissionsApi] Error exporting PDF:', error);
      throw error;
    }
  },

  /**
   * Get commission payments history
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>}
   */
  async getPayments(params = {}) {
    try {
      const cleanParams = Object.keys(params).reduce((acc, key) => {
        if (params[key] !== '' && params[key] != null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});

      const response = await api.get(`${API_BASE}/payments`, { params: cleanParams });
      return response.data;
    } catch (error) {
      console.error('[commissionsApi] Error fetching payments:', error);
      throw error;
    }
  },

  /**
   * Download payment receipt PDF
   * @param {string} paymentId - Payment ID
   * @returns {Promise<void>} - Triggers download
   */
  async downloadPaymentReceipt(paymentId) {
    try {
      const response = await api.get(`${API_BASE}/payments/${paymentId}/receipt`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `recibo_pagamento_${paymentId.substring(0, 8).toUpperCase()}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[commissionsApi] Error downloading receipt:', error);
      throw error;
    }
  },

  /**
   * Export commission receipt PDF based on filters
   * @param {Object} params - Filter parameters
   * @returns {Promise<void>} - Triggers download
   */
  async exportCommissionReceipt(params = {}) {
    try {
      const cleanParams = Object.keys(params).reduce((acc, key) => {
        if (params[key] !== '' && params[key] != null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});

      const response = await api.get(`${API_BASE}/export/receipt`, {
        params: cleanParams,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'recibo_comissoes.pdf';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[commissionsApi] Error exporting receipt:', error);
      throw error;
    }
  }
};