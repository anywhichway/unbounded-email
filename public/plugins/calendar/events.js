const Event = (event, state) => {
    const formatTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    return render({
        tagName: 'div',
        attributes: {
            class: 'calendar-event',
            style: `background-color: ${event.color || '#007bff'}; border-left: 3px solid ${event.color || '#007bff'}`,
            title: `${event.title}\n${formatTime(event.startDate)} - ${formatTime(event.endDate)}`,
            onclick: (e) => {
                e.stopPropagation();  // Prevent event bubbling to parent elements
                state.editingEvent = event;  // Set the event for editing
            }
        },
        children: [
            {
                tagName: 'div',
                attributes: { class: 'event-details' },
                children: [
                    {
                        tagName: 'span',
                        attributes: { class: 'event-title' },
                        children: [event.title]
                    },
                    {
                        tagName: 'span',
                        attributes: { class: 'event-time' },
                        children: [`${formatTime(event.startDate)} - ${formatTime(event.endDate)}`]
                    }
                ]
            }
        ]
    });
};
