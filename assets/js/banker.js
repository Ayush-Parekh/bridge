// Banker User Module
const Banker = {
    // Initialize banker dashboard
    initDashboard: function() {
        this.loadStats();
        this.loadLoanSchemes();
        this.loadProposals();
        this.loadActivities();
        this.setupEventListeners();
    },
    
    // Load dashboard statistics
    loadStats: function() {
        const userId = auth.currentUser.uid;
        
        // Get loan schemes count
        db.collection('loans')
            .where('userId', '==', userId)
            .get()
            .then(snapshot => {
                document.getElementById('loan-count').textContent = snapshot.size;
            })
            .catch(error => {
                console.error('Error getting loan count:', error);
                Logger.logError('get_loan_count_error', error);
            });
        
        // Get total loan amount
        db.collection('loans')
            .where('userId', '==', userId)
            .get()
            .then(snapshot => {
                let totalAmount = 0;
                snapshot.forEach(doc => {
                    totalAmount += doc.data().loanAmount || 0;
                });
                document.getElementById('loan-amount').textContent = Utils.formatCurrency(totalAmount);
            })
            .catch(error => {
                console.error('Error getting loan amount:', error);
                Logger.logError('get_loan_amount_error', error);
            });
        
        // Get loan applications count
        db.collection('loan_applications')
            .where('bankerId', '==', userId)
            .get()
            .then(snapshot => {
                document.getElementById('application-count').textContent = snapshot.size;
            })
            .catch(error => {
                console.error('Error getting application count:', error);
                Logger.logError('get_application_count_error', error);
            });
        
        // Get message count
        db.collection('messages')
            .where('recipientId', '==', userId)
            .where('read', '==', false)
            .get()
            .then(snapshot => {
                document.getElementById('message-count').textContent = snapshot.size;
            })
            .catch(error => {
                console.error('Error getting message count:', error);
                Logger.logError('get_message_count_error', error);
            });
    },
    
    // Load loan schemes
    loadLoanSchemes: function() {
        Database.getUserLoanSchemes()
            .then(loans => {
                const loansList = document.getElementById('loans-list');
                loansList.innerHTML = '';
                
                if (loans.length === 0) {
                    loansList.innerHTML = '<div class="empty-state">You haven\'t posted any loan schemes yet.</div>';
                    return;
                }
                
                loans.forEach(loan => {
                    const loanCard = document.createElement('div');
                    loanCard.className = 'card loan-card';
                    loanCard.innerHTML = `
                        <div class="card-header">
                            <h3>${loan.title}</h3>
                            <span class="badge">${loan.loanType}</span>
                        </div>
                        <div class="card-body">
                            <p>${Utils.truncateText(loan.description, 150)}</p>
                            <div class="loan-meta">
                                <span><i class="fas fa-money-bill-wave"></i> ${Utils.formatCurrency(loan.loanAmount)}</span>
                                <span><i class="fas fa-percentage"></i> ${loan.interestRate}% interest</span>
                                <span><i class="fas fa-calendar-alt"></i> ${loan.tenure} months</span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-outline" data-loan-id="${loan.id}" data-action="edit-loan">Edit</button>
                            <button class="btn btn-sm btn-danger" data-loan-id="${loan.id}" data-action="delete-loan">Delete</button>
                        </div>
                    `;
                    loansList.appendChild(loanCard);
                });
            })
            .catch(error => {
                console.error('Error loading loan schemes:', error);
                Logger.logError('load_loans_error', error);
            });
    },
    
    // Load business proposals
    loadProposals: function() {
        Database.getBusinessProposals(5)
            .then(proposals => {
                const proposalsList = document.getElementById('proposals-list');
                proposalsList.innerHTML = '';
                
                if (proposals.length === 0) {
                    proposalsList.innerHTML = '<div class="empty-state">No business proposals available at the moment.</div>';
                    return;
                }
                
                proposals.forEach(proposal => {
                    const proposalCard = document.createElement('div');
                    proposalCard.className = 'card proposal-card';
                    proposalCard.innerHTML = `
                        <div class="card-header">
                            <h3>${proposal.title}</h3>
                            <span class="badge">${Utils.getIndustryLabel(proposal.industry)}</span>
                        </div>
                        <div class="card-body">
                            <p>${Utils.truncateText(proposal.description, 150)}</p>
                            <div class="proposal-meta">
                                <span><i class="fas fa-money-bill-wave"></i> ${Utils.formatCurrency(proposal.fundingNeeded)}</span>
                                <span><i class="fas fa-eye"></i> ${proposal.views} views</span>
                                <span><i class="fas fa-calendar-alt"></i> ${Utils.formatDate(proposal.createdAt)}</span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-primary" data-proposal-id="${proposal.id}" data-action="view-proposal">View Details</button>
                            <button class="btn btn-sm btn-outline" data-proposal-id="${proposal.id}" data-action="suggest-loan">Suggest Loan</button>
                        </div>
                    `;
                    proposalsList.appendChild(proposalCard);
                });
            })
            .catch(error => {
                console.error('Error loading proposals:', error);
                Logger.logError('load_proposals_error', error);
            });
    },
    
    // Load recent activities
    loadActivities: function() {
        const userId = auth.currentUser.uid;
        
        db.collection('activities')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get()
            .then(snapshot => {
                const activitiesList = document.getElementById('activities-list');
                activitiesList.innerHTML = '';
                
                if (snapshot.empty) {
                    activitiesList.innerHTML = '<div class="empty-state">No recent activities.</div>';
                    return;
                }
                
                snapshot.forEach(doc => {
                    const activity = doc.data();
                    const activityItem = document.createElement('div');
                    activityItem.className = 'activity-item';
                    activityItem.innerHTML = `
                        <div class="activity-icon">
                            <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                        </div>
                        <div class="activity-content">
                            <p>${activity.description}</p>
                            <span class="activity-time">${Utils.formatDate(activity.timestamp)}</span>
                        </div>
                    `;
                    activitiesList.appendChild(activityItem);
                });
            })
            .catch(error => {
                console.error('Error loading activities:', error);
                Logger.logError('load_activities_error', error);
            });
    },
    
    // Get icon for activity type
    getActivityIcon: function(activityType) {
        const icons = {
            'loan_created': 'fa-hand-holding-usd',
            'loan_application_received': 'fa-file-alt',
            'message_sent': 'fa-paper-plane',
            'message_received': 'fa-envelope',
            'profile_updated': 'fa-user-edit',
            'default': 'fa-bell'
        };
        
        return icons[activityType] || icons.default;
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        // Post loan scheme form submission
        const loanForm = document.getElementById('loan-form');
        if (loanForm) {
            loanForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const title = document.getElementById('loan-title').value;
                const description = document.getElementById('loan-description').value;
                const loanType = document.getElementById('loan-type').value;
                const loanAmount = parseFloat(document.getElementById('loan-amount').value);
                const interestRate = parseFloat(document.getElementById('interest-rate').value);
                const tenure = parseInt(document.getElementById('loan-tenure').value);
                const eligibility = document.getElementById('loan-eligibility').value;
                
                const loanData = {
                    title,
                    description,
                    loanType,
                    loanAmount,
                    interestRate,
                    tenure,
                    eligibility
                };
                
                Database.postLoanScheme(loanData)
                    .then(loanId => {
                        alert('Loan scheme posted successfully!');
                        loanForm.reset();
                        
                        // Close modal
                        document.getElementById('loan-modal').classList.remove('active');
                        
                        // Reload loan schemes and stats
                        Banker.loadLoanSchemes();
                        Banker.loadStats();
                    })
                    .catch(error => {
                        console.error('Error posting loan scheme:', error);
                        alert(`Error posting loan scheme: ${error.message}`);
                        Logger.logError('post_loan_error', error);
                    });
            });
        }
        
        // Handle loan and proposal actions
        document.addEventListener('click', function(e) {
            if (e.target.matches('[data-action="edit-loan"]')) {
                const loanId = e.target.getAttribute('data-loan-id');
                // Implement edit functionality
                console.log('Edit loan:', loanId);
            } else if (e.target.matches('[data-action="delete-loan"]')) {
                const loanId = e.target.getAttribute('data-loan-id');
                if (confirm('Are you sure you want to delete this loan scheme?')) {
                    db.collection('loans').doc(loanId).update({
                        status: 'deleted'
                    })
                    .then(() => {
                        alert('Loan scheme deleted successfully!');
                        Banker.loadLoanSchemes();
                        Banker.loadStats();
                    })
                    .catch(error => {
                        console.error('Error deleting loan scheme:', error);
                        alert(`Error deleting loan scheme: ${error.message}`);
                        Logger.logError('delete_loan_error', error);
                    });
                }
            } else if (e.target.matches('[data-action="view-proposal"]')) {
                const proposalId = e.target.getAttribute('data-proposal-id');
                
                // Increment view count
                db.collection('proposals').doc(proposalId).update({
                    views: firebase.firestore.FieldValue.increment(1)
                });
                
                // Redirect to proposal details page
                window.location.href = `proposal-details.html?id=${proposalId}`;
            } else if (e.target.matches('[data-action="suggest-loan"]')) {
                const proposalId = e.target.getAttribute('data-proposal-id');
                
                // Get proposal data
                db.collection('proposals').doc(proposalId).get()
                    .then(doc => {
                        if (doc.exists) {
                            const proposal = doc.data();
                            const businessUserId = proposal.userId;
                            
                            // Open message modal with loan suggestion
                            // This would be implemented in a real application
                            alert(`Loan suggestion functionality would open a form to suggest loans to user ${businessUserId}`);
                        }
                    })
                    .catch(error => {
                        console.error('Error getting proposal:', error);
                        Logger.logError('get_proposal_error', error);
                    });
            }
        });
    }
};

// Initialize banker dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if on banker dashboard page
    if (document.body.classList.contains('banker-dashboard')) {
        // Wait for authentication to complete
        auth.onAuthStateChanged(user => {
            if (user) {
                Banker.initDashboard();
            }
        });
    }
});