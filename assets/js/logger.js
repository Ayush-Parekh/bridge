// Logging Module
const Logger = {
    // Log an event
    logEvent: function(eventName, eventData = {}) {
        // Add timestamp
        const timestamp = new Date().toISOString();
        const userId = auth.currentUser ? auth.currentUser.uid : 'anonymous';
        
        // Prepare log data
        const logData = {
            eventName,
            userId,
            timestamp,
            ...eventData
        };
        
        // Log to console in development
        console.log('EVENT:', logData);
        
        // Store in Firestore
        return db.collection('logs').add(logData)
            .catch(error => {
                console.error('Error logging event:', error);
            });
    },
    
    // Log an error
    logError: function(errorType, error, additionalData = {}) {
        // Add timestamp
        const timestamp = new Date().toISOString();
        const userId = auth.currentUser ? auth.currentUser.uid : 'anonymous';
        
        // Prepare error data
        const errorData = {
            errorType,
            userId,
            timestamp,
            errorMessage: error.message || String(error),
            errorStack: error.stack,
            ...additionalData
        };
        
        // Log to console in development
        console.error('ERROR:', errorData);
        
        // Store in Firestore
        return db.collection('error_logs').add(errorData)
            .catch(err => {
                console.error('Error logging error:', err);
            });
    },
    
    // Log page view
    logPageView: function() {
        const pagePath = window.location.pathname;
        const pageTitle = document.title;
        const referrer = document.referrer;
        
        this.logEvent('page_view', {
            pagePath,
            pageTitle,
            referrer
        });
    },
    
    // Log user action
    logUserAction: function(actionType, actionDetails = {}) {
        this.logEvent('user_action', {
            actionType,
            ...actionDetails
        });
    }
};

// Initialize logging
document.addEventListener('DOMContentLoaded', function() {
    // Log page view on load
    Logger.logPageView();
    
    // Track clicks on important elements
    const trackableElements = document.querySelectorAll('[data-track]');
    trackableElements.forEach(element => {
        element.addEventListener('click', function() {
            const actionType = this.getAttribute('data-track');
            const actionId = this.getAttribute('data-track-id') || '';
            
            Logger.logUserAction(actionType, { actionId });
        });
    });
});