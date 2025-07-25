
export function apiWithJwt(jwt: string | null) {
    return async function fetchWithJwt(
        input: RequestInfo,
        init: RequestInit = {}
    ) {
        const headers = new Headers(init.headers || {});
        if (jwt) {
            headers.set("Authorization", `Bearer ${jwt}`);
        }
        return fetch(input, { ...init, headers });
    };
}
