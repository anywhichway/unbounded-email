const ComposeEvent = (state) => {
    const event = state.editingEvent;
    const isNewEvent = !event.id;

    // Helper to format ISO date string for datetime-local input
    const formatForInput = (isoDate) => {
        if (!isoDate) return '';
        const d = new Date(isoDate);
        const pad = (num) => (num < 10 ? '0' : '') + num;
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Create a local copy of the event data to avoid re-renders on every keystroke
    const formData = {
        title: event.title || '',
        startDate: formatForInput(event.startDate),
        endDate: formatForInput(event.endDate),
        description: event.description || '',
        color: event.color || '#007bff'
    };

    const close = () => {
        state.editingEvent = null;
    };

    const save = () => {
        if (!formData.title) {
            alert("Event title is required.");
            return;
        }
        if (!formData.startDate || !formData.endDate) {
            alert("Start and end dates are required.");
            return;
        }

        if (isNewEvent) {
            const account = state.currentAccount || Object.keys(state.user.accounts).find(k => !k.startsWith('_'));
            if (!account) {
                alert("No account configured to save the event to.");
                return;
            }

            const newEvent = {
                id: Date.now() + Math.random(),
                title: formData.title,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: new Date(formData.endDate).toISOString(),
                description: formData.description,
                sourceAccount: account,
                color: formData.color
            };

            if (!state.user.accounts[account].events) {
                state.user.accounts[account].events = [];
            }
            state.user.accounts[account].events.unshift(newEvent);
            state.events.unshift(newEvent);
        } else {
            // Sync local formData back to the global event object
            event.title = formData.title;
            event.startDate = new Date(formData.startDate).toISOString();
            event.endDate = new Date(formData.endDate).toISOString();
            event.description = formData.description;
            event.color = formData.color;
            state.events = [...state.events]; // Ensures the UI updates
        }

        close();
    };

    return render({
        tagName: "div",
        attributes: {
            class: "modal-overlay",
            style: "display: flex; align-items: center; justify-content: center;",
            onclick(e) {
                if (e.target.classList.contains('modal-overlay')) {
                    close();
                }
            }
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "modal-content event-compose-modal"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;"
                        },
                        children: [
                            {
                                tagName: "h3",
                                attributes: { style: "margin: 0;" },
                                children: [isNewEvent ? "New Event" : "Edit Event"]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    class: "action-btn",
                                    title: "Close",
                                    onclick: close
                                },
                                children: [{ tagName: "i", attributes: { class: "fas fa-times" } }]
                            }
                        ]
                    },
                    {
                        tagName: 'input',
                        attributes: {
                            type: 'text',
                            placeholder: 'Event Title',
                            class: 'compose-input',
                            value: formData.title,
                            oninput(e) { formData.title = e.target.value; }
                        }
                    },
                    {
                        tagName: 'label', children: ['Start Date'],
                        attributes: { style: 'font-size: 12px; color: #666; margin-top: 10px; display: block;'}
                    },
                    {
                        tagName: 'input',
                        attributes: {
                            type: 'datetime-local',
                            class: 'compose-input',
                            value: formData.startDate,
                            oninput(e) { formData.startDate = e.target.value; }
                        }
                    },
                    {
                        tagName: 'label', children: ['End Date'],
                        attributes: { style: 'font-size: 12px; color: #666; margin-top: 10px; display: block;'}
                    },
                    {
                        tagName: 'input',
                        attributes: {
                            type: 'datetime-local',
                            class: 'compose-input',
                            value: formData.endDate,
                            oninput(e) { formData.endDate = e.target.value; }
                        }
                    },
                    {
                        tagName: 'textarea',
                        attributes: {
                            placeholder: 'Description...',
                            class: 'compose-textarea',
                            value: formData.description,
                            oninput(e) { formData.description = e.target.value; }
                        }
                    },
                    {
                        tagName: 'div',
                        attributes: { class: 'modal-buttons', style: "justify-content: flex-end;" },
                        children: [
                            {
                                tagName: 'button',
                                attributes: { class: 'modal-btn confirm-btn', onclick: save },
                                children: ['Save']
                            }
                        ]
                    }
                ]
            }
        ]
    });
};