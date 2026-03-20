export interface UnlockDialogMessage {
    title: string;
    subtitle: string;
}

export const UNLOCK_DIALOG_MESSAGES: UnlockDialogMessage[] = [
    {
        title: "Ready for another money mission?",
        subtitle: "Enter your entry password and let us keep your finances safe."
    },
    {
        title: "Vault door says: secret phrase please",
        subtitle: "One quick password check and your dashboard is all yours."
    },
    {
        title: "Captain, your finance cockpit awaits",
        subtitle: "Unlock the app to continue your smooth money journey."
    },
    {
        title: "Knock knock, budget guardian here",
        subtitle: "Type the password to open the gates for the next 15 minutes."
    },
    {
        title: "Your coins are taking a coffee break",
        subtitle: "Wake them up with your entry password."
    },
    {
        title: "Another secure checkpoint",
        subtitle: "Enter password to keep your private numbers private."
    },
    {
        title: "Welcome back, money mastermind",
        subtitle: "Unlock and continue building your financial wins."
    },
    {
        title: "Shh... this space is protected",
        subtitle: "Password first, then full access to your money world."
    },
    {
        title: "Your budget buddy missed you",
        subtitle: "Drop the password and jump right back in."
    },
    {
        title: "Security high-five time",
        subtitle: "Confirm the password to enter your personal finance zone."
    },
    {
        title: "The numbers are waiting for you",
        subtitle: "Unlock the app and pick up exactly where you left off."
    },
    {
        title: "Tiny lock, big peace of mind",
        subtitle: "Enter your password for a fresh 15-minute session."
    }
];

export function getRandomUnlockDialogMessage(): UnlockDialogMessage {
    const randomIndex = Math.floor(Math.random() * UNLOCK_DIALOG_MESSAGES.length);
    return UNLOCK_DIALOG_MESSAGES[randomIndex] || UNLOCK_DIALOG_MESSAGES[0];
}
