const Configure = async (state, set) => {
    return render({
        tagName: "div",
        attributes: {
            class: "plugin-wrapper"
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "plugin-header"
                },
                children: [
                    {
                        tagName: "h1",
                        children: ["Configure"]
                    },
                    {
                        tagName: "span",
                        attributes: {
                            class: "plugin-count"
                        },
                        children: [() => {
                            const count = state.accounts.length;
                            return `${count} account${count !== 1 ? 's' : ''}`;
                        }]
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "plugin-container"
                },
                children: [
                    // Screen Name Section
                    {
                        tagName: "div",
                        attributes: {
                            class: "form-section"
                        },
                        children: [
                            {
                                tagName: "h2",
                                children: ["User Settings"]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "screen-name"
                                        },
                                        children: ["Screen Name"]
                                    },
                                    {
                                        tagName: "input",
                                        attributes: {
                                            type: "text",
                                            id: "screen-name",
                                            value: () => state.user.screenName || ""
                                        }
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "button",
                                        attributes: {
                                            class: "btn btn-primary",
                                            onclick: async () => {
                                                const newScreenName = document.getElementById('screen-name').value;
                                                state.user.screenName = newScreenName;
                                            await set('user', state.user);
                                                alert('Screen name updated successfully!');
                                            }
                                        },
                                        children: [
                                            {
                                                tagName: "i",
                                                attributes: {
                                                    class: "fas fa-save"
                                                }
                                            },
                                            " Save Screen Name"
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    // Accounts Section
                    {
                        tagName: "div",
                        attributes: {
                            class: "form-section"
                        },
                        children: [
                            {
                                tagName: "h2",
                                children: ["Accounts"]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "accounts-list"
                                },
                                children: () => state.accounts.map(account => AccountItem(account, state, set))
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "button",
                                        attributes: {
                                            class: "btn btn-secondary",
                                            onclick: () => {
                                                state.showAddAccountForm = !state.showAddAccountForm;
                                            }
                                        },
                                        children: [
                                            {
                                                tagName: "i",
                                                attributes: {
                                                    class: "fas fa-plus"
                                                }
                                            },
                                            " Add Account"
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    // Add Account Form
                    () => state.showAddAccountForm ? {
                        tagName: "div",
                        attributes: {
                            class: "add-account-form"
                        },
                        children: [
                            {
                                tagName: "h3",
                                children: ["Add New Account"]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "account-email"
                                        },
                                        children: ["Email"]
                                    },
                                    {
                                        tagName: "input",
                                        attributes: {
                                            type: "email",
                                            id: "account-email",
                                            value: () => state.newAccount.email,
                                            oninput: (e) => {
                                                state.newAccount.email = e.target.value;
                                            }
                                        }
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "account-type"
                                        },
                                        children: ["Type"]
                                    },
                                    {
                                        tagName: "select",
                                        attributes: {
                                            id: "account-type",
                                            value: () => state.newAccount.type,
                                            onchange: (e) => {
                                                state.newAccount.type = e.target.value;
                                            }
                                        },
                                        children: [
                                            {
                                                tagName: "option",
                                                attributes: {
                                                    value: "Google"
                                                },
                                                children: ["Google"]
                                            },
                                            {
                                                tagName: "option",
                                                attributes: {
                                                    value: "Microsoft"
                                                },
                                                children: ["Microsoft"]
                                            },
                                            {
                                                tagName: "option",
                                                attributes: {
                                                    value: "Other"
                                                },
                                                children: ["Other"]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "account-name"
                                        },
                                        children: ["Name"]
                                    },
                                    {
                                        tagName: "input",
                                        attributes: {
                                            type: "text",
                                            id: "account-name",
                                            value: () => state.newAccount.name,
                                            oninput: (e) => {
                                                state.newAccount.name = e.target.value;
                                            }
                                        }
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "label",
                                        attributes: {
                                            for: "account-color"
                                        },
                                        children: ["Color"]
                                    },
                                    {
                                        tagName: "input",
                                        attributes: {
                                            type: "color",
                                            id: "account-color",
                                            value: () => state.newAccount.color,
                                            onchange: (e) => {
                                                state.newAccount.color = e.target.value;
                                            }
                                        }
                                    }
                                ]
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "form-group"
                                },
                                children: [
                                    {
                                        tagName: "button",
                                        attributes: {
                                            class: "btn btn-primary",
                                            onclick: async () => {
                                                await addAccount(state);
                                            }
                                        },
                                        children: [
                                            {
                                                tagName: "i",
                                                attributes: {
                                                    class: "fas fa-plus"
                                                }
                                            },
                                            " Add Account"
                                        ]
                                    },
                                    {
                                        tagName: "button",
                                        attributes: {
                                            class: "btn btn-secondary",
                                            onclick: () => {
                                                state.showAddAccountForm = false;
                                                // Reset form
                                                state.newAccount = {
                                                    email: '',
                                                    type: 'Google',
                                                    name: '',
                                                    color: '#007bff'
                                                };
                                            }
                                        },
                                        children: [
                                            {
                                                tagName: "i",
                                                attributes: {
                                                    class: "fas fa-times"
                                                }
                                            },
                                            " Cancel"
                                        ]
                                    }
                                ]
                            }
                        ]
                    } : null
                ]
            }
        ]
    });
};

const addAccount = async (state) => {
    const { email, type, name, color } = state.newAccount;

    if (!email) {
        alert('Email is required');
        return;
    }

    if (state.user.accounts[email]) {
        alert('Account already exists');
        return;
    }

    state.user.accounts[email] = {
        type,
        name: name || email.split('@')[0],
        color,
        folders: ["Inbox", "Drafts", "Sent", "Spam", "Trash"],
        emails: [],
        contacts: [],
        calendar: []
    };

    await set('user', state.user);

    // Reset form and hide it
    state.showAddAccountForm = false;
    state.newAccount = {
        email: '',
        type: 'Google',
        name: '',
        color: '#007bff'
    };

    // Update account emails list
    state.accountEmails = Object.keys(state.user.accounts);

    alert('Account added successfully!');
};