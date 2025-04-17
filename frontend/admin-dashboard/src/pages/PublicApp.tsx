import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import { API_BASE_URL, PUBLIC_API_URL } from '../config';

const PublicApp: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appHtml, setAppHtml] = useState<string>('');

  useEffect(() => {
    const fetchApp = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the API base URL from config
        // Use PUBLIC_API_URL for public apps if available, otherwise fall back to API_BASE_URL
        const apiBaseUrl = PUBLIC_API_URL || API_BASE_URL;

        console.log(`Fetching app HTML from ${apiBaseUrl}/api/v1/public-apps/${slug}`);

        // Fetch the app HTML from the public endpoint
        const response = await axios.get(`${apiBaseUrl}/api/v1/public-apps/${slug}`, {
          responseType: 'text',
        });

        console.log('Received app HTML, length:', response.data.length);

        // Set the HTML content to be rendered in the iframe
        setAppHtml(response.data);
      } catch (err: any) {
        console.error('Error fetching app:', err);
        setError(err.response?.data?.detail || 'Failed to load app');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchApp();
    }
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto', mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Use an iframe to render the app HTML instead of dangerouslySetInnerHTML
  // This ensures the app runs in its own context and can make API calls properly
  return (
    <Box sx={{ height: '100vh', overflow: 'auto' }}>
      <iframe
        srcDoc={appHtml}
        title="Deployed App"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          overflow: 'auto'
        }}
      />
    </Box>
  );
};

export default PublicApp;
