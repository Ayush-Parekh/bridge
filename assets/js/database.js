// Database Operations Module
const Database = {
    // Get current user ID
    getCurrentUserId: function() {
        const user = auth.currentUser;
        return user ? user.uid : null;
    },
    
    // Get current user data
    getCurrentUserData: function() {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        return db.collection('users').doc(userId).get()
            .then(doc => {
                if (doc.exists) {
                    return doc.data();
                } else {
                    throw new Error('User data not found');
                }
            });
    },
    
    // Post a business proposal
    postBusinessProposal: function(proposalData) {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        // Add user ID and timestamp to proposal data
        const fullProposalData = {
            ...proposalData,
            userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            views: 0,
            status: 'active'
        };
        
        // If business plan file is included, upload it first
        if (proposalData.businessPlanFile) {
            const storage = firebase.storage();
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`business_plans/${userId}_${Date.now()}`);
            
            return fileRef.put(proposalData.businessPlanFile).then(snapshot => {
                return snapshot.ref.getDownloadURL();
            })
            .then(downloadURL => {
                // Add file URL to proposal data and remove file object
                const { businessPlanFile, ...dataWithoutFile } = fullProposalData;
                const dataWithFileUrl = {
                    ...dataWithoutFile,
                    businessPlanUrl: downloadURL
                };
                
                // Add to Firestore
                return db.collection('proposals').add(dataWithFileUrl);
            })
            .then(docRef => {
                // Log proposal creation
                Logger.logEvent('proposal_created', { proposal_id: docRef.id });
                return docRef.id;
            });
        } else {
            // Add to Firestore without file
            return db.collection('proposals').add(fullProposalData)
                .then(docRef => {
                    // Log proposal creation
                    Logger.logEvent('proposal_created', { proposal_id: docRef.id });
                    return docRef.id;
                });
        }
    },
    
    // Get business proposals
    getBusinessProposals: function(limit = 10, filter = null) {
        let query = db.collection('proposals')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc');
        
        // Apply filters if provided
        if (filter) {
            if (filter.industry) {
                query = query.where('industry', '==', filter.industry);
            }
            
            if (filter.minFunding) {
                query = query.where('fundingNeeded', '>=', filter.minFunding);
            }
            
            if (filter.maxFunding) {
                query = query.where('fundingNeeded', '<=', filter.maxFunding);
            }
        }
        
        return query.limit(limit).get()
            .then(snapshot => {
                const proposals = [];
                snapshot.forEach(doc => {
                    proposals.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                return proposals;
            });
    },
    
    // Get user's business proposals
    getUserProposals: function() {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        return db.collection('proposals')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                const proposals = [];
                snapshot.forEach(doc => {
                    proposals.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                return proposals;
            });
    },
    
    // Post an investment opportunity
    postInvestmentOpportunity: function(opportunityData) {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        // Add user ID and timestamp to opportunity data
        const fullOpportunityData = {
            ...opportunityData,
            userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            views: 0,
            status: 'active'
        };
        
        return db.collection('opportunities').add(fullOpportunityData)
            .then(docRef => {
                // Log opportunity creation
                Logger.logEvent('opportunity_created', { opportunity_id: docRef.id });
                return docRef.id;
            });
    },
    
    // Get investment opportunities
    getInvestmentOpportunities: function(limit = 10, filter = null) {
        let query = db.collection('opportunities')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc');
        
        // Apply filters if provided
        if (filter) {
            if (filter.industries && filter.industries.length > 0) {
                // Firestore doesn't support array-contains-any with other where clauses
                // This is a limitation we'll handle in the application code
            }
            
            if (filter.minInvestment) {
                query = query.where('minInvestment', '>=', filter.minInvestment);
            }
            
            if (filter.maxInvestment) {
                query = query.where('maxInvestment', '<=', filter.maxInvestment);
            }
        }
        
        return query.limit(limit).get()
            .then(snapshot => {
                let opportunities = [];
                snapshot.forEach(doc => {
                    opportunities.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                // Apply industry filter if provided (client-side filtering)
                if (filter && filter.industries && filter.industries.length > 0) {
                    opportunities = opportunities.filter(opp => {
                        return opp.preferredIndustries.some(industry => 
                            filter.industries.includes(industry));
                    });
                }
                
                return opportunities;
            });
    },
    
    // Get user's investment opportunities
    getUserOpportunities: function() {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        return db.collection('opportunities')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                const opportunities = [];
                snapshot.forEach(doc => {
                    opportunities.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                return opportunities;
            });
    },
    
    // Post a loan scheme
    postLoanScheme: function(loanData) {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        // Add user ID and timestamp to loan data
        const fullLoanData = {
            ...loanData,
            userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            views: 0,
            status: 'active'
        };
        
        return db.collection('loans').add(fullLoanData)
            .then(docRef => {
                // Log loan scheme creation
                Logger.logEvent('loan_scheme_created', { loan_id: docRef.id });
                return docRef.id;
            });
    },
    
    // Get loan schemes
    getLoanSchemes: function(limit = 10, filter = null) {
        let query = db.collection('loans')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc');
        
        // Apply filters if provided
        if (filter) {
            if (filter.minAmount) {
                query = query.where('loanAmount', '>=', filter.minAmount);
            }
            
            if (filter.maxAmount) {
                query = query.where('loanAmount', '<=', filter.maxAmount);
            }
            
            if (filter.maxInterestRate) {
                query = query.where('interestRate', '<=', filter.maxInterestRate);
            }
            
            if (filter.bankName) {
                query = query.where('bankName', '==', filter.bankName);
            }
        }
        
        return query.limit(limit).get()
            .then(snapshot => {
                const loans = [];
                snapshot.forEach(doc => {
                    loans.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                return loans;
            });
    },
    
    // Get user's loan schemes (for bankers)
    getUserLoanSchemes: function() {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        return db.collection('loans')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                const loans = [];
                snapshot.forEach(doc => {
                    loans.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                return loans;
            });
    },
    
    // Post a question to advisor
    postQuestion: function(questionData) {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        // Add user ID and timestamp to question data
        const fullQuestionData = {
            ...questionData,
            userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'unanswered',
            answers: []
        };
        
        return db.collection('questions').add(fullQuestionData)
            .then(docRef => {
                // Log question creation
                Logger.logEvent('question_posted', { question_id: docRef.id });
                return docRef.id;
            });
    },
    
    // Get questions (for advisors)
    getQuestions: function(limit = 10, filter = null) {
        let query = db.collection('questions')
            .orderBy('createdAt', 'desc');
        
        // Apply filters if provided
        if (filter) {
            if (filter.status) {
                query = query.where('status', '==', filter.status);
            }
            
            if (filter.category) {
                query = query.where('category', '==', filter.category);
            }
        }
        
        return query.limit(limit).get()
            .then(snapshot => {
                const questions = [];
                snapshot.forEach(doc => {
                    questions.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                return questions;
            });
    },
    
    // Get user's questions
    getUserQuestions: function() {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        return db.collection('questions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                const questions = [];
                snapshot.forEach(doc => {
                    questions.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                return questions;
            });
    },
    
    // Post an answer to a question
    postAnswer: function(questionId, answerText) {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        // Get user data for the answer
        return this.getCurrentUserData().then(userData => {
            const answer = {
                userId,
                userName: userData.name,
                userRole: userData.role,
                text: answerText,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add answer to the question document
            return db.collection('questions').doc(questionId).update({
                answers: firebase.firestore.FieldValue.arrayUnion(answer),
                status: 'answered'
            }).then(() => {
                // Log answer posted
                Logger.logEvent('answer_posted', { question_id: questionId });
                return true;
            });
        });
    },
    
    // Update user profile
    updateUserProfile: function(profileData) {
        const userId = this.getCurrentUserId();
        if (!userId) return Promise.reject('No user logged in');
        
        // If profile picture is included, upload it first
        if (profileData.profilePicture && profileData.profilePicture instanceof File) {
            const storage = firebase.storage();
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`profile_pictures/${userId}`);
            
            return fileRef.put(profileData.profilePicture).then(snapshot => {
                return snapshot.ref.getDownloadURL();
            })
            .then(downloadURL => {
                // Add file URL to profile data and remove file object
                const { profilePicture, ...dataWithoutFile } = profileData;
                const dataWithFileUrl = {
                    ...dataWithoutFile,
                    avatarUrl: downloadURL,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Update in Firestore
                return db.collection('users').doc(userId).update(dataWithFileUrl);
            })
            .then(() => {
                // Log profile update
                Logger.logEvent('profile_updated', { user_id: userId });
                return true;
            });
        } else {
            // Update without file
            const updateData = {
                ...profileData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Remove profilePicture if it exists but is not a File
            if (updateData.profilePicture) {
                delete updateData.profilePicture;
            }
            
            return db.collection('users').doc(userId).update(updateData)
                .then(() => {
                    // Log profile update
                    Logger.logEvent('profile_updated', { user_id: userId });
                    return true;
                });
        }
    }
};