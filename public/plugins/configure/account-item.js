const AccountItem = (account, state, set) => {
    return {
        tagName: "div",
        attributes: {
            class: "account-item"
        },
        children: [
            {
                tagName: "div",
                attributes: {
                    class: "account-info"
                },
                children: [
                    {
                        tagName: "div",
                        attributes: {
                            class: "account-header"
                        },
                        children: [
                            {
                                tagName: "div",
                                attributes: {
                                    class: "account-color",
                                    style: `background-color: ${account.color}`
                                }
                            },
                            {
                                tagName: "div",
                                attributes: {
                                    class: "account-details"
                                },
                                children: [
                                    {
                                        tagName: "div",
                                        attributes: {
                                            class: "account-name"
                                        },
                                        children: [account.name]
                                    },
                                    {
                                        tagName: "div",
                                        attributes: {
                                            class: "account-email"
                                        },
                                        children: [account.email]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        tagName: "div",
                        attributes: {
                            class: "account-stats"
                        },
                        children: [
                            {
                                tagName: "span",
                                attributes: {
                                    class: "stat-item"
                                },
                                children: [
                                    {
                                        tagName: "i",
                                        attributes: {
                                            class: "fas fa-envelope"
                                        }
                                    },
                                    ` ${account.emailsCount} emails`
                                ]
                            },
                            {
                                tagName: "span",
                                attributes: {
                                    class: "stat-item"
                                },
                                children: [
                                    {
                                        tagName: "i",
                                        attributes: {
                                            class: "fas fa-user"
                                        }
                                    },
                                    ` ${account.contactsCount} contacts`
                                ]
                            },
                            {
                                tagName: "span",
                                attributes: {
                                    class: "stat-item"
                                },
                                children: [
                                    {
                                        tagName: "i",
                                        attributes: {
                                            class: "fas fa-calendar"
                                        }
                                    },
                                    ` ${account.calendarCount} events`
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                tagName: "div",
                attributes: {
                    class: "account-actions"
                },
                children: [
                    {
                        tagName: "a",
                        attributes: {
                            class: "btn btn-link",
                            href: "#",
                            onclick: (e) => {
                                e.preventDefault();
                                // Navigate to account page
                                window.location.href = `../account/index.html?account=${encodeURIComponent(account.email)}`;
                            }
                        },
                        children: [
                            {
                                tagName: "i",
                                attributes: {
                                    class: "fas fa-external-link-alt"
                                }
                            },
                            " View"
                        ]
                    },
                    {
                        tagName: "button",
                        attributes: {
                            class: "btn btn-danger",
                            onclick: async () => {
                                await deleteAccount(account.email, state);
                            }
                        },
                        children: [
                            {
                                tagName: "i",
                                attributes: {
                                    class: "fas fa-trash"
                                }
                            },
                            " Delete"
                        ]
                    }
                ]
            }
        ]
    };
};

const deleteAccount = async (email, state) => {
    if (confirm(`Are you sure you want to delete the account ${email}? This action cannot be undone.`)) {
        delete state.user.accounts[email];
    delete state.user.accounts[email];
    await set('user', state.user);

    // Update account emails list
    state.accountEmails = Object.keys(state.user.accounts);        alert('Account deleted successfully!');
    }
};