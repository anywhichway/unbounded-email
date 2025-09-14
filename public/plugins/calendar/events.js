const Event = async (event, appState) => {
    return render({
        tagName: "div",
        attributes: {
            class: "event-item",
            style: `border-left-color: ${event.color}`,
            onclick(event) {
                // Prevent detail view from opening when clicking action buttons
                if (!event.target.closest('.event-actions')) {
                    // Log event interaction (placeholder for future detail view)
                    console.log('Event clicked:', event.title);
                }
            }
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "event-header"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "event-title"
                        },
                        children: [() => event.title]
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "event-time"
                        },
                        children: [() => {
                            if (event.allDay) {
                                return 'All day';
                            }
                            const startTime = event.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const endTime = event.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return `${startTime} - ${endTime}`;
                        }]
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "event-details"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "event-location"
                        },
                        children: [() => event.location ? `📍 ${event.location}` : '']
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "event-description"
                        },
                        children: [() => event.description ? event.description.substring(0, 100) + (event.description.length > 100 ? '...' : '') : '']
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "event-attendees"
                        },
                        children: [() => {
                            if (!event.attendees || event.attendees.length === 0) return [];
                            const attendeeText = event.attendees.length === 1 ?
                                `1 attendee` : `${event.attendees.length} attendees`;
                            return `👥 ${attendeeText}`;
                        }]
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "event-footer"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "event-account"
                        },
                        children: [() => event.accountType]
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "event-tags"
                        },
                        children: () => {
                            if (!event.tags || event.tags.length === 0) return [];

                            return event.tags.map(tag => ({
                                tagName: "span",
                                attributes: {
                                    class: "event-tag"
                                },
                                children: [tag]
                            }));
                        }
                    }
                ]
            }
        ]
    });
};
