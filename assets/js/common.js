// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgAat3g1ih0aVS31TJdkbeYAy2HA_yjxI",
  authDomain: "bridge-investor.firebaseapp.com",
  projectId: "bridge-investor",
  storageBucket: "bridge-investor.firebasestorage.app",
  messagingSenderId: "677460343328",
  appId: "1:677460343328:web:1a51c13d3619bda0731a45",
  measurementId: "G-0GD4T6SCRH"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Common UI functions
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('active');
        });
    }

    // Modal functionality
    const openModalButtons = document.querySelectorAll('[id$="-settings"], [id^="post-"]');
    openModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modalId = this.id.replace('post-', '').replace('-settings', '');
            const modal = document.getElementById(`${modalId}-modal`);
            if (modal) {
                modal.classList.add('active');
                // Log modal open event
                Logger.logEvent('modal_opened', { modal_id: modalId });
            }
        });
    });

    const closeModalButtons = document.querySelectorAll('.close-modal');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.remove('active');
            // Log modal close event
            Logger.logEvent('modal_closed', { modal_id: modal.id });
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
            // Log modal close event
            Logger.logEvent('modal_closed', { modal_id: event.target.id, method: 'outside_click' });
        }
    });

    // Contact form submission
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;
            
            // Store contact message in Firestore
            db.collection('contact_messages').add({
                name: name,
                email: email,
                message: message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                alert('Message sent successfully!');
                contactForm.reset();
                // Log contact form submission
                Logger.logEvent('contact_form_submitted', { email: email });
            })
            .catch(error => {
                console.error('Error sending message:', error);
                alert('Error sending message. Please try again.');
                // Log error
                Logger.logError('contact_form_error', error);
            });
        });
    }

    // Newsletter subscription
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            
            // Store subscription in Firestore
            db.collection('newsletter_subscriptions').add({
                email: email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                alert('Subscribed successfully!');
                newsletterForm.reset();
                // Log newsletter subscription
                Logger.logEvent('newsletter_subscribed', { email: email });
            })
            .catch(error => {
                console.error('Error subscribing:', error);
                alert('Error subscribing. Please try again.');
                // Log error
                Logger.logError('newsletter_subscription_error', error);
            });
        });
    }
});

// Utility functions
const Utils = {
    formatDate: function(timestamp) {
        if (!timestamp) return 'N/A';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    },
    
    truncateText: function(text, maxLength = 100) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    getIndustryLabel: function(industryCode) {
        const industries = {
            'tech': 'Technology',
            'healthcare': 'Healthcare',
            'education': 'Education',
            'finance': 'Finance',
            'retail': 'Retail',
            'other': 'Other'
        };
        return industries[industryCode] || 'Unknown';
    },
    
    getBusinessStageLabel: function(stageCode) {
        const stages = {
            'idea': 'Idea Stage',
            'prototype': 'Prototype',
            'early-revenue': 'Early Revenue',
            'growth': 'Growth Stage'
        };
        return stages[stageCode] || 'Unknown';
    },
    
    getInvestmentRangeLabel: function(rangeCode) {
        const ranges = {
            '0-100000': '₹0 - ₹1 Lakh',
            '100000-1000000': '₹1 Lakh - ₹10 Lakhs',
            '1000000-10000000': '₹10 Lakhs - ₹1 Crore',
            '10000000+': 'Above ₹1 Crore'
        };
        return ranges[rangeCode] || 'Unknown';
    }
};