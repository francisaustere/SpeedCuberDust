
export class StorageManager {
    private static isLocalAvailable: boolean | null = null;

    private static checkAvailability(): boolean {
        if (this.isLocalAvailable !== null) return this.isLocalAvailable;
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            this.isLocalAvailable = true;
        } catch (e) {
            this.isLocalAvailable = false;
        }
        return this.isLocalAvailable;
    }

    static getItem(key: string): string | null {
        try {
            if (this.checkAvailability()) {
                return localStorage.getItem(key);
            } else {
                return sessionStorage.getItem(key);
            }
        } catch (e) {
            console.warn('Storage read failed', e);
            return null;
        }
    }

    static setItem(key: string, value: string): void {
        try {
            if (this.checkAvailability()) {
                localStorage.setItem(key, value);
            } else {
                sessionStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn('Storage write failed', e);
        }
    }

    static removeItem(key: string): void {
        try {
            if (this.checkAvailability()) {
                localStorage.removeItem(key);
            } else {
                sessionStorage.removeItem(key);
            }
        } catch (e) {
            console.warn('Storage remove failed', e);
        }
    }

    static clear(): void {
        try {
            if (this.checkAvailability()) {
                localStorage.clear();
            }
            sessionStorage.clear();
        } catch (e) {
            console.warn('Storage clear failed', e);
        }
    }
}
