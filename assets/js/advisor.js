// Advisor User Module
const Advisor = {
    // Initialize advisor dashboard
    initDashboard: function() {
        this.loadStats();
        this.loadQuestions();
        this.loadActivities();
        this.setupEventListeners();
    },
    
    // Load dashboard statistics
    loadStats: function() {
        const userId = auth.currentUser.uid;
        
        // Get questions count
        db.collection('questions')
            .where('status', '==', 'unanswered')
            .get()
            .then(snapshot => {
                document.getElementById('question-count').textContent = snapshot.size;
            })
            .catch(error => {
                console.error('Error getting question count:', error);
                Logger.logError('get_question_count_error', error);
            });
        
        // Get answers count
        db.collection('questions')
            .get()
            .then(snapshot => {
                let answerCount = 0;
                snapshot.forEach(doc => {
                    const answers = doc.data().answers || [];
                    answerCount += answers.filter(answer => answer.userId === userId).length;
                });
                document.getElementById('answer-count').textContent = answerCount;
            })
            .catch(error => {
                console.error('Error getting answer count:', error);
                Logger.logError('get_answer_count_error', error);
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
    
    // Load questions
    loadQuestions: function() {
        db.collection('questions')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get()
            .then(snapshot => {
                const questionsList = document.getElementById('questions-list');
                questionsList.innerHTML = '';
                
                if (snapshot.empty) {
                    questionsList.innerHTML = '<div class="empty-state">No questions available at the moment.</div>';
                    return;
                }
                
                snapshot.forEach(doc => {
                    const question = doc.data();
                    question.id = doc.id;
                    
                    const questionCard = document.createElement('div');
                    questionCard.className = `card question-card ${question.status === 'unanswered' ? 'unanswered' : ''}`;
                    questionCard.innerHTML = `
                        <div class="card-header">
                            <h3>${question.title}</h3>
                            <span class="badge">${question.category}</span>
                            <span class="badge ${question.status === 'unanswered' ? 'badge-warning' : 'badge-success'}">${question.status}</span>
                        </div>
                        <div class="card-body">
                            <p>${Utils.truncateText(question.content, 200)}</p>
                            <div class="question-meta">
                                <span><i class="fas fa-user"></i> ${question.userName || 'Anonymous'}</span>
                                <span><i class="fas fa-calendar-alt"></i> ${Utils.formatDate(question.createdAt)}</span>
                                <span><i class="fas fa-comment"></i> ${question.answers ? question.answers.length : 0} answers</span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-primary" data-question-id="${question.id}" data-action="view-question">View Details</button>
                            ${question.status === 'unanswered' ? `<button class="btn btn-sm btn-outline" data-question-id="${question.id}" data-action="answer-question">Answer</button>` : ''}
                        </div>
                    `;
                    questionsList.appendChild(questionCard);
                });
            })
            .catch(error => {
                console.error('Error loading questions:', error);
                Logger.logError('load_questions_error', error);
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
            'question_answered': 'fa-comment-dots',
            'message_sent': 'fa-paper-plane',
            'message_received': 'fa-envelope',
            'profile_updated': 'fa-user-edit',
            'default': 'fa-bell'
        };
        
        return icons[activityType] || icons.default;
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        // Handle question actions
        document.addEventListener('click', function(e) {
            if (e.target.matches('[data-action="view-question"]')) {
                const questionId = e.target.getAttribute('data-question-id');
                // Redirect to question details page
                window.location.href = `question-details.html?id=${questionId}`;
            } else if (e.target.matches('[data-action="answer-question"]')) {
                const questionId = e.target.getAttribute('data-question-id');
                
                // Get question data
                db.collection('questions').doc(questionId).get()
                    .then(doc => {
                        if (doc.exists) {
                            const question = doc.data();
                            
                            // Show answer modal
                            const answerModal = document.getElementById('answer-modal');
                            if (answerModal) {
                                // Set question title in modal
                                const questionTitle = answerModal.querySelector('.question-title');
                                if (questionTitle) {
                                    questionTitle.textContent = question.title;
                                }
                                
                                // Set question ID in form
                                const questionIdInput = document.getElementById('question-id');
                                if (questionIdInput) {
                                    questionIdInput.value = questionId;
                                }
                                
                                // Show modal
                                answerModal.classList.add('active');
                            } else {
                                // Fallback if modal doesn't exist
                                const answer = prompt(`Your answer to: ${question.title}`);
                                if (answer) {
                                    Database.postAnswer(questionId, answer)
                                        .then(() => {
                                            alert('Answer posted successfully!');
                                            Advisor.loadQuestions();
                                            Advisor.loadStats();
                                        })
                                        .catch(error => {
                                            console.error('Error posting answer:', error);
                                            alert(`Error posting answer: ${error.message}`);
                                            Logger.logError('post_answer_error', error);
                                        });
                                }
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Error getting question:', error);
                        Logger.logError('get_question_error', error);
                    });
            }
        });
        
        // Answer form submission
        const answerForm = document.getElementById('answer-form');
        if (answerForm) {
            answerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const questionId = document.getElementById('question-id').value;
                const answerText = document.getElementById('answer-text').value;
                
                Database.postAnswer(questionId, answerText)
                    .then(() => {
                        alert('Answer posted successfully!');
                        answerForm.reset();
                        
                        // Close modal
                        document.getElementById('answer-modal').classList.remove('active');
                        
                        // Reload questions and stats
                        Advisor.loadQuestions();
                        Advisor.loadStats();
                    })
                    .catch(error => {
                        console.error('Error posting answer:', error);
                        alert(`Error posting answer: ${error.message}`);
                        Logger.logError('post_answer_error', error);
                    });
            });
        }
    }
};

// Initialize advisor dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if on advisor dashboard page
    if (document.body.classList.contains('advisor-dashboard')) {
        // Wait for authentication to complete
        auth.onAuthStateChanged(user => {
            if (user) {
                Advisor.initDashboard();
            }
        });
    }
});