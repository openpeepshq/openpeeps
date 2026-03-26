import validator from "validator";

const { isUUID } = validator;

export const isPostPath = (path: string) => path.startsWith('/posts/') && isUUID(path.substring(7));
export const isJamPath = (path: string) => path.startsWith('/events/') && isUUID(path.substring(8, 44)) && path.endsWith('/jam');
export const isGroupPath = (path: string) => path.startsWith('/groups/@');


export const isLocalLink = (url: string, origin: string) => {
    const urlObj = new URL(url);
    return urlObj.origin === origin && (isPostPath(urlObj.pathname) || isJamPath(urlObj.pathname) || isGroupPath(urlObj.pathname));
};

export const isValidUrl = (url?: string) => {
    if (!url) {
        return false;
    }
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

export const isEmail = (url: string) => {
	return /^mailto:|^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url);
};
