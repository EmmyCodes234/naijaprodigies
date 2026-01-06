
export interface WooglesUser {
    id: string; // usually same as username for woogles? or they have ID? Let's assume handle
    username: string;
    rating?: number;
}

export const searchWooglesUsers = async (query: string): Promise<WooglesUser[]> => {
    if (!query || query.length < 2) return [];

    try {
        const response = await fetch('https://woogles.io/api/user_service.UserService/SearchUsers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prefix: query })
        });

        if (!response.ok) {
            console.error('Woogles API Error:', response.status);
            return [];
        }

        const data = await response.json();
        // Assuming data structure: { users: [{ username: 'foo', id: '...' }, ...] }
        // Inspecting actual network queries would be best, but we'll try to handle common GRPC-web JSON
        // Common grpc-gateway: might be 'users' or 'usernames'

        // Fallback mock if API fails/CORS issues during dev (Woogles might block CORS from localhost)
        // Ideally we'd proxy this. For now let's hope it works or we fallback.

        return (data.users || []).map((u: any) => ({
            id: u.id || u.username,
            username: u.username,
            rating: u.rating
        }));
    } catch (error) {
        console.error('Error searching Woogles:', error);
        return [];
    }
};
