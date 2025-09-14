const Email = async (email, appState) => {
    // Get tagIcons from appState or default to empty object
    const tagIcons = appState.tagIcons || {};

    return render({
        tagName: "div",
        attributes: {
            class() {
                let classes = 'email-item';
                if (email.unread) classes += ' unread';
                if (email.starred) classes += ' starred';
                if (email.scheduled) classes += ' scheduled';
                if (email.snoozed) classes += ' snoozed';
                return classes;
            },
            'data-id': email.id,
            onclick(event) {
                // Prevent detail view from opening when clicking action buttons
                if (!event.target.closest('.email-action-btn')) {
                    // Log email interaction (placeholder for future detail view)
                    console.log('Email clicked:', email.id);
                }
            }
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "email-avatar"
                },
                children: [() => (email.from || 'Unknown').charAt(0).toUpperCase()]
            },
            {
                tagName: "div",
                attributes: {
                    class: "email-info"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "email-sender"
                        },
                        children: [() => email.from || 'Unknown Sender']
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "email-subject"
                        },
                        children: [() => email.subject || 'No Subject']
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "email-preview"
                        },
                        children: [() => email.preview || 'No preview available']
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "email-meta"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "email-date"
                        },
                        children: [() => {
                            const date = new Date(email.date);
                            const now = new Date();
                            const diffTime = Math.abs(now - date);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            if (diffDays === 1) {
                                return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            } else if (diffDays <= 7) {
                                return date.toLocaleDateString([], {weekday: 'short'});
                            } else {
                                return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
                            }
                        }]
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "email-account"
                        },
                        children: [() => email.sourceAccount || '']
                    },
                    () => {
                        const statusElements = [];

                        if (email.scheduled) {
                            statusElements.push({
                                tagName: "span",
                                attributes: {
                                    class: "email-status scheduled"
                                },
                                children: [
                                    {
                                        tagName: "i",
                                        attributes: {
                                            class: "fas fa-calendar-alt"
                                        }
                                    },
                                    " Scheduled"
                                ]
                            });
                        }

                        if (email.snoozed) {
                            statusElements.push({
                                tagName: "span",
                                attributes: {
                                    class: "email-status snoozed"
                                },
                                children: [
                                    {
                                        tagName: "i",
                                        attributes: {
                                            class: "fas fa-clock"
                                        }
                                    },
                                    " Snoozed"
                                ]
                            });
                        }

                        return statusElements;
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "email-actions"
                },
                children: [
                    {
                        tagName: "button",
                        attributes: {
                            class: "email-action-btn",
                            title: "Star",
                            onclick() {
                                email.starred = !email.starred;
                            }
                        },
                        children: [
                            {
                                tagName: "i",
                                attributes: {
                                    class: () => email.starred ? "fas fa-star" : "far fa-star"
                                }
                            }
                        ]
                    },
                    {
                        tagName: "button",
                        attributes: {
                            class: "email-action-btn",
                            title: "Snooze",
                            onclick() {
                                // Simple snooze for 1 hour
                                const snoozeTime = new Date();
                                snoozeTime.setHours(snoozeTime.getHours() + 1);
                                appState.updateSnooze(email.id, snoozeTime.toISOString());
                            }
                        },
                        children: [
                            {
                                tagName: "i",
                                attributes: {
                                    class: "fas fa-clock"
                                }
                            }
                        ]
                    },
                    {
                        tagName: "button",
                        attributes: {
                            class: "email-action-btn",
                            title: "Schedule",
                            onclick() {
                                // Simple schedule for tomorrow
                                const scheduleTime = new Date();
                                scheduleTime.setDate(scheduleTime.getDate() + 1);
                                appState.updateSchedule(email.id, scheduleTime.toISOString());
                            }
                        },
                        children: [
                            {
                                tagName: "i",
                                attributes: {
                                    class: "fas fa-calendar-alt"
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    });
};