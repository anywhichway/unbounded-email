const Compose = (state) => {
    const email = state.editingEmail;

    const close = () => {
        state.editingEmail = null;
    };

    const send = () => {
        const fromAccount = state.currentAccount || Object.keys(state.user.accounts).find(k => !k.startsWith('_'));
        if (!fromAccount) {
            alert("No account configured to send email from.");
            return;
        }

        if (!email.to) {
            alert("Recipient is required.");
            return;
        }

        const newEmail = {
            id: Date.now() + Math.random(),
            from: fromAccount,
            to: email.to,
            subject: email.subject || 'No Subject',
            htmlBody: email.body,
            textBody: email.body,
            date: new Date().toISOString(),
            unread: false,
            folder: 'Sent',
            sourceAccount: fromAccount,
        };

        if (!state.user.accounts[fromAccount].emails) {
            state.user.accounts[fromAccount].emails = [];
        }
        state.user.accounts[fromAccount].emails.unshift(newEmail);

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
                    class: "modal-content email-compose-modal"
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
                                children: ["New Message"]
                            },
                            {
                                tagName: "button",
                                attributes: {
                                    class: "email-action-btn",
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
                            type: 'email',
                            placeholder: 'To',
                            class: 'compose-input',
                            value: email.to || '',
                            oninput(e) { email.to = e.target.value; }
                        }
                    },
                    {
                        tagName: 'input',
                        attributes: {
                            type: 'text',
                            placeholder: 'Subject',
                            class: 'compose-input',
                            value: email.subject || '',
                            oninput(e) { email.subject = e.target.value; }
                        }
                    },
                    {
                        tagName: 'textarea',
                        attributes: {
                            placeholder: 'Compose email...',
                            class: 'compose-textarea',
                            oninput(e) { email.body = e.target.value; }
                        },
                        children: [email.body || '']
                    },
                    {
                        tagName: 'div',
                        attributes: { class: 'modal-buttons', style: "justify-content: flex-end;" },
                        children: [
                            {
                                tagName: 'button',
                                attributes: { class: 'modal-btn confirm-btn', onclick: send },
                                children: ['Send']
                            }
                        ]
                    }
                ]
            }
        ]
    });
};