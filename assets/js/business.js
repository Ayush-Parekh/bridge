// Business User Module
const Business = {
    // Initialize business dashboard
    initDashboard: function() {
        this.loadStats();
        this.loadProposals();
        this.loadOpportunities();
        this.loadActivities();
        this.setupEventListeners();
    },
    
    // Load dashboard statistics
    loadStats: function() {
        const userId = auth.currentUser.uid;
        
        // Get proposal count
        db.collection('proposals')
            .where('userId', '==', userId)
            .get()
            .then(snapshot => {
                document.getElementById('proposal-count').textContent = snapshot.size;
            })
            .catch(error => {
                console.error('Error getting proposal count:', error);
                Logger.logError('get_proposal_count_error', error);
            });
        
        // Get total proposal views
        db.collection('proposals')
            .where('userId', '==', userId)
            .get()
            .then(snapshot => {
                let totalViews = 0;
                snapshot.forEach(doc => {
                    totalViews += doc.data().views || 0;
                });
                document.getElementById('proposal-views').textContent = totalViews;
            })
            .catch(error => {
                console.error('Error getting proposal views:', error);
                Logger.logError('get_proposal_views_error', error);
            });
        
        // Get investment opportunities count
        db.collection('opportunities')
            .where('status', '==', 'active')
            .get()
            .then(snapshot => {
                document.getElementById('opportunity-count').textContent = snapshot.size;
            })
            .catch(error => {
                console.error('Error getting opportunity count:', error);
                Logger.logError('get_opportunity_count_error', error);
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
    
    // Load business proposals
    loadProposals: function() {
        Database.getUserProposals()
            .then(proposals => {
                const proposalsList = document.getElementById('proposals-list');
                proposalsList.innerHTML = '';
                
                if (proposals.length === 0) {
                    proposalsList.innerHTML = '<div class="empty-state">You haven\'t posted any business proposals yet.</div>';
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
                            <button class="btn btn-sm btn-outline" data-proposal-id="${proposal.id}" data-action="edit-proposal">Edit</button>
                            <button class="btn btn-sm btn-danger" data-proposal-id="${proposal.id}" data-action="delete-proposal">Delete</button>
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
    
    // Load investment opportunities
    loadOpportunities: function() {
        Database.getInvestmentOpportunities(5)
            .then(opportunities => {
                const opportunitiesList = document.getElementById('opportunities-list');
                opportunitiesList.innerHTML = '';
                
                if (opportunities.length === 0) {
                    opportunitiesList.innerHTML = '<div class="empty-state">No investment opportunities available at the moment.</div>';
                    return;
                }
                
                opportunities.forEach(opportunity => {
                    const opportunityCard = document.createElement('div');
                    opportunityCard.className = 'card opportunity-card';
                    opportunityCard.innerHTML = `
                        <div class="card-header">
                            <h3>${opportunity.title}</h3>
                            <span class="badge">${opportunity.preferredIndustries.map(ind => Utils.getIndustryLabel(ind)).join(', ')}</span>
                        </div>
                        <div class="card-body">
                            <p>${Utils.truncateText(opportunity.description, 150)}</p>
                            <div class="opportunity-meta">
                                <span><i class="fas fa-money-bill-wave"></i> ${Utils.formatCurrency(opportunity.minInvestment)} - ${Utils.formatCurrency(opportunity.maxInvestment)}</span>
                                <span><i class="fas fa-calendar-alt"></i> ${Utils.formatDate(opportunity.createdAt)}</span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-primary" data-opportunity-id="${opportunity.id}" data-action="view-opportunity">View Details</button>
                        </div>
                    `;
                    opportunitiesList.appendChild(opportunityCard);
                });
            })
            .catch(error => {
                console.error('Error loading opportunities:', error);
                Logger.logError('load_opportunities_error', error);
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
            'proposal_created': 'fa-file-alt',
            'proposal_viewed': 'fa-eye',
            'message_received': 'fa-envelope',
            'profile_updated': 'fa-user-edit',
            'default': 'fa-bell'
        };
        
        return icons[activityType] || icons.default;
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        // Post proposal form submission
        const proposalForm = document.getElementById('proposal-form');
        if (proposalForm) {
            proposalForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const title = document.getElementById('proposal-title').value;
                const description = document.getElementById('proposal-description').value;
                const industry = document.getElementById('proposal-industry').value;
                const fundingNeeded = parseFloat(document.getElementById('proposal-funding').value);
                const businessPlanFile = document.getElementById('proposal-file').files[0];
                
                const proposalData = {
                    title,
                    description,
                    industry,
                    fundingNeeded,
                    businessPlanFile
                };
                
                Database.postBusinessProposal(proposalData)
                    .then(proposalId => {
                        alert('Business proposal posted successfully!');
                        proposalForm.reset();
                        
                        // Close modal
                        document.getElementById('proposal-modal').classList.remove('active');
                        
                        // Reload proposals
                        Business.loadProposals();
                        Business.loadStats();
                    })
                    .catch(error => {
                        console.error('Error posting proposal:', error);
                        alert(`Error posting proposal: ${error.message}`);
                        Logger.logError('post_proposal_error', error);
                    });
            });
        }
        
        // Handle proposal actions (edit, delete)
        document.addEventListener('click', function(e) {
            if (e.target.matches('[data-action="edit-proposal"]')) {
                const proposalId = e.target.getAttribute('data-proposal-id');
                // Implement edit functionality
                console.log('Edit proposal:', proposalId);
            } else if (e.target.matches('[data-action="delete-proposal"]')) {
                const proposalId = e.target.getAttribute('data-proposal-id');
                if (confirm('Are you sure you want to delete this proposal?')) {
                    db.collection('proposals').doc(proposalId).update({
                        status: 'deleted'
                    })
                    .then(() => {
                        alert('Proposal deleted successfully!');
                        Business.loadProposals();
                        Business.loadStats();
                    })
                    .catch(error => {
                        console.error('Error deleting proposal:', error);
                        alert(`Error deleting proposal: ${error.message}`);
                        Logger.logError('delete_proposal_error', error);
                    });
                }
            } else if (e.target.matches('[data-action="view-opportunity"]')) {
                const opportunityId = e.target.getAttribute('data-opportunity-id');
                // Implement view opportunity details
                console.log('View opportunity:', opportunityId);
            }
        });
    }
};

// Initialize business dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if on business dashboard page
    if (document.body.classList.contains('business-dashboard')) {
        // Wait for authentication to complete
        auth.onAuthStateChanged(user => {
            if (user) {
                Business.initDashboard();
            }
        });
    }
});