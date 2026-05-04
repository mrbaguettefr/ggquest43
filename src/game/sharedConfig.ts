export const SHARED_CONFIG = {
    encrypted_welcome_message: 'ECJBMjooNngNQFsiZ1wkMDYndERHEzUiTD17',
    encrypted_secret_gift: 'AQZmFHgCGhJ5GXAIA2h8ZHdg'
};

export const decryptConfigValue = (encryptedValue: string, seedGameCode: string) => {
    if (seedGameCode.length === 0)
    {
        return '';
    }

    const bytes = Uint8Array.from(atob(encryptedValue), (character) => character.charCodeAt(0));
    const decoded = Array.from(bytes, (byte, index) => {
        const key = seedGameCode.charCodeAt(index % seedGameCode.length);

        return String.fromCharCode(byte ^ key);
    }).join('');

    return decoded;
};
