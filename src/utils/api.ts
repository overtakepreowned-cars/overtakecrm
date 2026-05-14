export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('authToken');
    
    const headers = {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : '',
    };

    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401) {
        // Handle unauthorized (e.g., redirect to login or clear state)
        // Since we are in a utility, we might just return the response and let the caller handle it
        // but often we want to clear local storage if the token is invalid
        console.warn('Unauthorized request - session might be expired');
    }

    return res;
};
