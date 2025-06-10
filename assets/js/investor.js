// Investor User Module
const Investor = {
    // Initialize investor dashboard
    initDashboard: function() {
        this.loadStats();
        this.loadProposals();
        this.loadRecommendations();
        this.loadActivities();
        this.setupEventListeners();
    },
    
    // Load dashboard statistics
    loadStats: function() {
        const userId = auth.currentUser.uid;
        
        // Get proposal count
        db.collection('proposals')
            .where('status', '==', 'active')
            .get()
            .then(snapshot => {
                document.getElementById('proposal-count').textContent = snapshot.size;
            })
            .catch(error => {
                console.error('Error getting proposal count:', error);
                Logger.logError('get_proposal_count_error', error);
            });
        
        // Get investments count
        db.collection('investments')
            .where('investorId', '==', userId)
            .get()
            .then(snapshot => {
                document.getElementById('investment-count').textContent = snapshot.size;
                
                // Calculate total investment amount
                let totalInvestment = 0;
                snapshot.forEach(doc => {
                    totalInvestment += doc.data().amount || 0;
                });
                document.getElementById('investment-amount').textContent = Utils.formatCurrency(totalInvestment);
            })
            .catch(error => {
                console.error('Error getting investments:', error);
                Logger.logError('get_investments_error', error);
            });
        
        // Get opportunity count
        db.collection('opportunities')
            .where('userId', '==', userId)
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
                            <button class="btn btn-sm btn-outline" data-proposal-id="${proposal.id}" data-action="contact-business">Contact</button>
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
    
    // Load recommended proposals
    loadRecommendations: function() {
        // Get investor preferences
        Database.getCurrentUserData()
            .then(userData => {
                const industries = userData.industries || [];
                const investmentRange = userData.investmentRange || '0-100000';
                
                // Parse investment range
                let [minInvestment, maxInvestment] = investmentRange.split('-');
                minInvestment = parseInt(minInvestment);
                maxInvestment = maxInvestment === '+' ? Infinity : parseInt(maxInvestment);
                
                // Get proposals matching preferences
                return Database.getBusinessProposals(5, {
                    industries,
                    minFunding: minInvestment,
                    maxFunding: maxInvestment
                });
            })
            .then(proposals => {
                const recommendationsList = document.getElementById('recommendations-list');
                recommendationsList.innerHTML = '';
                
                if (proposals.length === 0) {
                    recommendationsList.innerHTML = '<div class="empty-state">No recommended proposals available at the moment.</div>';
                    return;
                }
                
                proposals.forEach(proposal => {
                    const proposalCard = document.createElement('div');
                    proposalCard.className = 'card proposal-card recommended';
                    proposalCard.innerHTML = `
                        <div class="card-header">
                            <h3>${proposal.title}</h3>
                            <span class="badge">${Utils.getIndustryLabel(proposal.industry)}</span>
                        </div>
                        <div class="card-body">
                            <p>${Utils.truncateText(proposal.description, 150)}</p>
                            <div class="proposal-meta">
                                <span><i class="fas fa-money-bill-wave"></i> ${Utils.formatCurrency(proposal.fundingNeeded)}</span>
                                <span><i class="fas fa-calendar-alt"></i> ${Utils.formatDate(proposal.createdAt)}</span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-primary" data-proposal-id="${proposal.id}" data-action="view-proposal">View Details</button>
                        </div>
                    `;
                    recommendationsList.appendChild(proposalCard);
                });
            })
            .catch(error => {
                console.error('Error loading recommendations:', error);
                Logger.logError('load_recommendations_error', error);
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
            'opportunity_created': 'fa-bullhorn',
            'proposal_viewed': 'fa-eye',
            'investment_made': 'fa-handshake',
            'message_sent': 'fa-paper-plane',
            'message_received': 'fa-envelope',
            'profile_updated': 'fa-user-edit',
            'default': 'fa-bell'
        };
        
        return icons[activityType] || icons.default;
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        // Post opportunity form submission
        const opportunityForm = document.getElementById('opportunity-form');
        if (opportunityForm) {
            opportunityForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const title = document.getElementById('opportunity-title').value;
                const description = document.getElementById('opportunity-description').value;
                const minInvestment = parseFloat(document.getElementById('min-investment').value);
                const maxInvestment = parseFloat(document.getElementById('max-investment').value);
                const preferredIndustries = Array.from(document.querySelectorAll('input[name="preferred-industry"]:checked')).map(cb => cb.value);
                
                const opportunityData = {
                    title,
                    description,
                    minInvestment,
                    maxInvestment,
                    preferredIndustries
                };
                
                Database.postInvestmentOpportunity(opportunityData)
                    .then(opportunityId => {
                        alert('Investment opportunity posted successfully!');
                        opportunityForm.reset();
                        
                        // Close modal
                        document.getElementById('opportunity-modal').classList.remove('active');
                        
                        // Reload stats
                        Investor.loadStats();
                    })
                    .catch(error => {
                        console.error('Error posting opportunity:', error);
                        alert(`Error posting opportunity: ${error.message}`);
                        Logger.logError('post_opportunity_error', error);
                    });
            });
        }
        
        // Handle proposal actions
        document.addEventListener('click', function(e) {
            if (e.target.matches('[data-action="view-proposal"]')) {
                const proposalId = e.target.getAttribute('data-proposal-id');
                
                // Increment view count
                db.collection('proposals').doc(proposalId).update({
                    views: firebase.firestore.FieldValue.increment(1)
                });
                
                // Redirect to proposal details page
                window.location.href = `proposal-details.html?id=${proposalId}`;
            } else if (e.target.matches('[data-action="contact-business"]')) {
                const proposalId = e.target.getAttribute('data-proposal-id');
                
                // Get proposal data
                db.collection('proposals').doc(proposalId).get()
                    .then(doc => {
                        if (doc.exists) {
                            const proposal = doc.data();
                            const businessUserId = proposal.userId;
                            
                            // Open message modal
                            // This would be implemented in a real application
                            alert(`Contact functionality would open a message form to contact user ${businessUserId}`);
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

// Initialize investor dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if on investor dashboard page
    if (document.body.classList.contains('investor-dashboard')) {
        // Wait for authentication to complete
        auth.onAuthStateChanged(user => {
            if (user) {
                Investor.initDashboard();
            }
        });
    }
});