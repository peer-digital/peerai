import React from 'react';
import { ToastContainer as ReactToastContainer, toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '@mui/material/styles';

// Toast options
const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

// Toast types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Toast functions
export const showToast = (message: string, type: ToastType = 'info', options?: ToastOptions) => {
  const toastOptions = { ...defaultOptions, ...options };
  
  switch (type) {
    case 'success':
      return toast.success(message, toastOptions);
    case 'error':
      return toast.error(message, toastOptions);
    case 'warning':
      return toast.warning(message, toastOptions);
    case 'info':
    default:
      return toast.info(message, toastOptions);
  }
};

// Toast container component
export const ToastContainer: React.FC = () => {
  const theme = useTheme();
  
  return (
    <ReactToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={theme.palette.mode === 'dark' ? 'dark' : 'light'}
      style={{ zIndex: 9999 }}
      toastStyle={{
        borderRadius: '6px',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
        fontSize: '14px',
      }}
    />
  );
};

export default ToastContainer; 