const ComposeContact = (state) => {
    const contact = state.editingContact;
    const isNewContact = !contact.id;

    // Create a local copy of the contact data to avoid re-renders on every keystroke
    const formData = {
        screenName: contact.screenName || '',  // Added screenName field
        name: { first: contact.name?.first || '', last: contact.name?.last || '' },
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || ''
    };

    const close = () => {
        state.editingContact = null;
    };

    const save = () => {
        if (!formData.name.first && !formData.name.last && !formData.screenName) {
            alert("Contact name or screen name is required.");
            return;
        }

        // Sensible default for screenName: use first + last if available, else email, else 'Unknown'
        let screenName = formData.screenName.trim();
        if (!screenName) {
            screenName = (formData.name.first + ' ' + formData.name.last).trim() || formData.email || 'Unknown';
        }

        // Sync local formData back to the global contact object
        contact.screenName = screenName;  // Added
        contact.name = formData.name;
        contact.email = formData.email;
        contact.phone = formData.phone;
        contact.company = formData.company;

        if (isNewContact) {
            const account = state.currentAccount || Object.keys(state.user.accounts).find(k => !k.startsWith('_'));
            if (!account) {
                alert("No account configured to save the contact to.");
                return;
            }

            contact.id = Date.now() + Math.random();
            contact.sourceAccount = account;

            if (!state.user.accounts[account].contacts) {
                state.user.accounts[account].contacts = [];
            }
            state.user.accounts[account].contacts.unshift(contact);
        } else {
            // For editing: ensure the existing contact in the array is updated (in case contact is not a direct reference)
            const account = contact.sourceAccount || state.currentAccount || Object.keys(state.user.accounts).find(k => !k.startsWith('_'));
            if (account && state.user.accounts[account].contacts) {
                const index = state.user.accounts[account].contacts.findIndex(c => c.id === contact.id);
                if (index !== -1) {
                    state.user.accounts[account].contacts[index] = contact;
                }
            }
        }
        
        updateFilteredContacts(state);
        close();
    };

    return render({
        tagName: "div",
        attributes: {
            class: "modal-overlay",
            style: "display: flex; align-items: center; justify-content: center;",
            onclick(event) {
                if (event.target.classList.contains('modal-overlay')) {
                    close();
                }
            }
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "modal-content contact-compose-modal"
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
                                children: [isNewContact ? "New Contact" : "Edit Contact"]
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
                    // Added screenName input
                    {
                        tagName: 'input',
                        attributes: {
                            type: 'text',
                            placeholder: 'Screen Name',
                            class: 'compose-input',
                            value: formData.screenName,
                            oninput(e) { formData.screenName = e.target.value; }
                        }
                    },
                    {
                        tagName: 'input',
                        attributes: {
                            type: 'text',
                            placeholder: 'First Name',
                            class: 'compose-input',
                            value: formData.name.first,
                            oninput(e) { formData.name.first = e.target.value; }
                        }
                    },
                    {
                        tagName: 'input',
                        attributes: {
                            type: 'text',
                            placeholder: 'Last Name',
                            class: 'compose-input',
                            value: formData.name.last,
                            oninput(e) { formData.name.last = e.target.value; }
                        }
                    },
                    {
                        tagName: 'input',
                        attributes: {
                            type: 'email',
                            placeholder: 'Email',
                            class: 'compose-input',
                            value: formData.email,
                            oninput(e) { formData.email = e.target.value; }
                        }
                    },
                    {
                        tagName: 'input',
                        attributes: {
                            type: 'tel',
                            placeholder: 'Phone',
                            class: 'compose-input',
                            value: formData.phone,
                            oninput(e) { formData.phone = e.target.value; }
                        }
                    },
                    {
                        tagName: 'input',
                        attributes: {
                            type: 'text',
                            placeholder: 'Company',
                            class: 'compose-input',
                            value: formData.company,
                            oninput(e) { formData.company = e.target.value; }
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