export const splitSecret = (secret: string) => {
    const chunk = Math.ceil(secret.length / 3);

    return [
        secret.slice(0, chunk),
        secret.slice(chunk, chunk * 2),
        secret.slice(chunk * 2)
    ];
};
