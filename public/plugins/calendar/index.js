function getEventsFromAccounts(userData) {
    const events = [];

    if (userData && userData.accounts) {
        // Iterate through each account
        Object.keys(userData.accounts).forEach(accountEmail => {
            const account = userData.accounts[accountEmail];

            // Add events from the account's events array
            if (account.events && Array.isArray(account.events)) {
                account.events.forEach(event => {
                    // Handle the actual data structure with date, startTime, endTime
                    let startDate, endDate;

                    if (event.date && event.startTime) {
                        // Combine date and startTime
                        startDate = new Date(`${event.date}T${event.startTime}`);
                    } else if (event.date) {
                        // All-day event
                        startDate = new Date(event.date);
                    } else {
                        startDate = new Date();
                    }

                    if (event.date && event.endTime) {
                        // Combine date and endTime
                        endDate = new Date(`${event.date}T${event.endTime}`);
                    } else if (event.date) {
                        // All-day event - end at end of day
                        endDate = new Date(event.date);
                        endDate.setHours(23, 59, 59, 999);
                    } else {
                        endDate = new Date();
                    }

                    const normalizedEvent = {
                        id: event.id || `${accountEmail}-${Date.now()}-${Math.random()}`,
                        title: event.title || 'Untitled Event',
                        description: event.description || '',
                        startDate: startDate,
                        endDate: endDate,
                        allDay: event.allDay || !event.startTime, // If no startTime, it's all-day
                        location: event.location || '',
                        attendees: event.attendees || [],
                        accountType: account.type || 'unknown',
                        sourceAccount: accountEmail,
                        color: event.color || account.color || '#3174ad',
                        tags: event.tags || [],
                        recurrence: event.recurrence || null,
                        reminders: event.reminders || []
                    };
                    events.push(normalizedEvent);
                });
            }
        });
    }

    return events;
}

function getEventsForDate(events, date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return events.filter(event => {
        const eventStart = new Date(event.startDate);
        eventStart.setHours(0, 0, 0, 0);

        const eventEnd = new Date(event.endDate);
        eventEnd.setHours(0, 0, 0, 0);

        return targetDate >= eventStart && targetDate <= eventEnd;
    });
}

function getEventsForMonth(events, year, month) {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    return events.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);

        return eventStart <= endOfMonth && eventEnd >= startOfMonth;
    });
}

function getEventsForWeek(events, startDate) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() - startDate.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return events.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);

        return eventStart <= weekEnd && eventEnd >= weekStart;
    });
}
