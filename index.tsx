import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { Auth0Provider } from '@auth0/auth0-react';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// --- Auth0 Configuration ---
// IMPORTANT: Replace these placeholder values with your actual Auth0 credentials.
// You should set these as Environment Variables in your Netlify deployment settings.
// For local development, you can create a .env file if your setup supports it,
// but for deployment, use Netlify's UI.
//
// Example Netlify Environment Variables:
// VITE_AUTH0_DOMAIN      -> your-tenant.us.auth0.com
// VITE_AUTH0_CLIENT_ID   -> yourClientABC123

const auth0Domain = 'YOUR_AUTH0_DOMAIN';
const auth0ClientId = 'YOUR_AUTH0_CLIENT_ID';


if (auth0Domain === 'YOUR_AUTH0_DOMAIN' || auth0ClientId === 'YOUR_AUTH0_CLIENT_ID') {
    const errorDiv = document.createElement('div');
    errorDiv.style.padding = '20px';
    errorDiv.style.backgroundColor = '#ffdddd';
    errorDiv.style.border = '1px solid #ff0000';
    errorDiv.innerHTML = `
        <h1>Auth0 Configuration Missing</h1>
        <p>Please update <code>auth0Domain</code> and <code>auth0ClientId</code> in <code>index.tsx</code> with your Auth0 application credentials.</p>
    `;
    rootElement.innerHTML = '';
    rootElement.appendChild(errorDiv);
} else {
    root.render(
      <React.StrictMode>
        <Auth0Provider
          domain={auth0Domain}
          clientId={auth0ClientId}
          authorizationParams={{
            redirect_uri: window.location.origin
          }}
        >
          <AuthProvider>
            <App />
          </AuthProvider>
        </Auth0Provider>
      </React.StrictMode>
    );
}