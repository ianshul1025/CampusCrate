// Base configuration for API requests
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

/**
 * A wrapper around fetch that automatically includes the Clerk Authorization token
 */
export const fetchWithAuth = async (endpoint, options = {}, getToken) => {
    const token = await getToken();

    const headers = {
        ...options.headers,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    // If we're not sending FormData (like pictures), default to JSON
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    } else {
        // Delete Content-Type so browser sets it correctly with boundaries for FormData
        delete headers['Content-Type'];
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        if (data.code === 'USER_BLOCKED') {
            window.dispatchEvent(new CustomEvent("user-blocked", { detail: data.message }));
        }
        throw new Error(data.message || 'An error occurred during the request.');
    }

    return data;
};
