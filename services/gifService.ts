
const TENOR_API_KEY = 'LIVDSRZULELA'; // Public test key
const TENOR_CLIENT_KEY = 'NSP_Web_App';
const BASE_URL = 'https://api.tenor.com/v1';

export interface GifResult {
    id: string;
    url: string;
    preview: string;
    title: string;
    width: number;
    height: number;
}

export const getTrendingGifs = async (limit = 20, pos?: string): Promise<{ gifs: GifResult[], nextPos: string }> => {
    try {
        const response = await fetch(`${BASE_URL}/trending?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=${limit}&pos=${pos || ''}`);
        if (!response.ok) throw new Error('Failed to fetch trending GIFs');
        const data = await response.json();

        return {
            gifs: data.results.map(mapTenorResult),
            nextPos: data.next,
        };
    } catch (error) {
        console.error('Error in getTrendingGifs:', error);
        return { gifs: [], nextPos: '' };
    }
};

export const searchGifs = async (query: string, limit = 20, pos?: string): Promise<{ gifs: GifResult[], nextPos: string }> => {
    try {
        const response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=${limit}&pos=${pos || ''}`);
        if (!response.ok) throw new Error('Failed to search GIFs');
        const data = await response.json();

        return {
            gifs: data.results.map(mapTenorResult),
            nextPos: data.next,
        };
    } catch (error) {
        console.error('Error in searchGifs:', error);
        return { gifs: [], nextPos: '' };
    }
};

const mapTenorResult = (result: any): GifResult => {
    // Prefer higher quality if available, but media[0] usually has gif/tinygif/mp4
    const media = result.media[0];
    // Use 'mediumgif' or 'gif' for display, 'nanogif' for preview if needed
    // 'tinygif' is good for grids
    return {
        id: result.id,
        url: media.gif.url, // Full size for the post
        preview: media.tinygif.url, // Smaller for the grid
        title: result.title,
        width: media.gif.dims[0],
        height: media.gif.dims[1],
    };
};
