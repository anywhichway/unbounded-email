function getAccountsFromUser(userData) {
    const accounts = [];

    if (userData && userData.accounts) {
        // Iterate through each account
        Object.keys(userData.accounts).forEach(accountEmail => {
            const account = userData.accounts[accountEmail];

            const normalizedAccount = {
                email: accountEmail,
                type: account.type || 'Other',
                name: account.name || accountEmail.split('@')[0],
                color: account.color || '#007bff',
                folders: account.folders || ["Inbox", "Drafts", "Sent", "Spam", "Trash"],
                emailsCount: account.emails ? account.emails.length : 0,
                contactsCount: account.contacts ? account.contacts.length : 0,
                calendarCount: account.calendar ? account.calendar.length : 0
            };
            accounts.push(normalizedAccount);
        });
    }

    return accounts;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getAccountsFromUser };
}
