// Authentication Module
const Auth = {
    // Check if user is logged in
    checkAuthState: function() {
        auth.onAuthStateChanged(user => {
            if (user) {
                // User is signed in
                this.getUserRole(user.uid).then(role => {
                    // Log user login
                    Logger.logEvent('user_logged_in', { 
                        user_id: user.uid,
                        email: user.email,
                        role: role
                    });
                    
                    // Redirect to appropriate dashboard if on login/register page
                    const currentPath = window.location.pathname;
                    if (currentPath.includes('login.html') || currentPath.includes('register.html') || currentPath === '/' || currentPath === '/index.html') {
                        window.location.href = `pages/dashboard-${role}.html`;
                    }
                    
                    // Update UI with user info
                    this.updateUserInfo(user);
                });
            } else {
                // User is signed out
                // Redirect to login page if trying to access protected pages
                const currentPath = window.location.pathname;
                if (currentPath.includes('dashboard') || currentPath.includes('proposals.html') || 
                    currentPath.includes('investments.html') || currentPath.includes('loans.html') || 
                    currentPath.includes('qa.html')) {
                    window.location.href = 'login.html';
                }
            }
        });
    },
    
    // Get user role from Firestore
    getUserRole: function(userId) {
        return db.collection('users').doc(userId).get()
            .then(doc => {
                if (doc.exists) {
                    return doc.data().role;
                } else {
                    console.error('No user document found!');
                    return null;
                }
            })
            .catch(error => {
                console.error('Error getting user role:', error);
                Logger.logError('get_user_role_error', error);
                return null;
            });
    },
    
    // Update UI with user information
    updateUserInfo: function(user) {
        const userNameElement = document.getElementById('user-name');
        const userAvatarElement = document.getElementById('user-avatar');
        
        if (userNameElement) {
            db.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        userNameElement.textContent = userData.name;
                        
                        // Update avatar if available
                        if (userData.avatarUrl && userAvatarElement) {
                            userAvatarElement.src = userData.avatarUrl;
                        }
                        
                        // Pre-fill profile form if it exists
                        this.prefillProfileForm(userData);
                    }
                })
                .catch(error => {
                    console.error('Error getting user data:', error);
                    Logger.logError('get_user_data_error', error);
                });
        }
    },
    
    // Pre-fill profile form with user data
    prefillProfileForm: function(userData) {
        const profileForm = document.getElementById('profile-form');
        if (!profileForm) return;
        
        // Set basic profile fields
        const nameInput = document.getElementById('profile-name');
        const emailInput = document.getElementById('profile-email');
        const bioInput = document.getElementById('profile-bio');
        
        if (nameInput) nameInput.value = userData.name || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (bioInput) bioInput.value = userData.bio || '';
        
        // Set role-specific fields
        switch (userData.role) {
            case 'investor':
                const investmentRange = document.getElementById('investment-range');
                if (investmentRange) investmentRange.value = userData.investmentRange || '0-100000';
                
                // Set industry checkboxes
                if (userData.industries) {
                    const industryCheckboxes = document.querySelectorAll('input[name="industry"]');
                    industryCheckboxes.forEach(checkbox => {
                        checkbox.checked = userData.industries.includes(checkbox.value);
                    });
                }
                break;
                
            case 'business':
                const businessIndustry = document.getElementById('business-industry');
                const businessStage = document.getElementById('business-stage');
                
                if (businessIndustry) businessIndustry.value = userData.industry || 'tech';
                if (businessStage) businessStage.value = userData.businessStage || 'idea';
                break;
                
            case 'banker':
                const bankName = document.getElementById('bank-name');
                const bankPosition = document.getElementById('bank-position');
                
                if (bankName) bankName.value = userData.bankName || '';
                if (bankPosition) bankPosition.value = userData.bankPosition || '';
                break;
                
            case 'advisor':
                const experience = document.getElementById('experience');
                if (experience) experience.value = userData.experience || 0;
                
                // Set expertise checkboxes
                if (userData.expertise) {
                    const expertiseCheckboxes = document.querySelectorAll('input[name="expertise"]');
                    expertiseCheckboxes.forEach(checkbox => {
                        checkbox.checked = userData.expertise.includes(checkbox.value);
                    });
                }
                break;
        }
    },
    
    // Register a new user
    registerUser: function(event) {
        event.preventDefault();
        
        // Get form data
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const role = document.querySelector('input[name="role"]:checked').value;
        const bio = document.getElementById('bio').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        // Get role-specific data
        let roleData = {};
        
        switch (role) {
            case 'investor':
                const investmentRange = document.getElementById('investment-range').value;
                const industries = Array.from(document.querySelectorAll('input[name="industry"]:checked')).map(cb => cb.value);
                
                roleData = {
                    investmentRange,
                    industries
                };
                break;
                
            case 'business':
                const industry = document.getElementById('business-industry').value;
                const businessStage = document.getElementById('business-stage').value;
                
                roleData = {
                    industry,
                    businessStage
                };
                break;
                
            case 'banker':
                const bankName = document.getElementById('bank-name').value;
                const bankPosition = document.getElementById('bank-position').value;
                
                roleData = {
                    bankName,
                    bankPosition
                };
                break;
                
            case 'advisor':
                const expertise = Array.from(document.querySelectorAll('input[name="expertise"]:checked')).map(cb => cb.value);
                const experience = document.getElementById('experience').value;
                
                roleData = {
                    expertise,
                    experience
                };
                break;
        }
        
        // Create user with email and password
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                
                // Create user document in Firestore
                return db.collection('users').doc(user.uid).set({
                    name,
                    email,
                    role,
                    bio,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    ...roleData
                });
            })
            .then(() => {
                // Log registration event
                Logger.logEvent('user_registered', { 
                    email,
                    role
                });
                
                // Redirect to appropriate dashboard
                window.location.href = `dashboard-${role}.html`;
            })
            .catch(error => {
                console.error('Error registering user:', error);
                alert(`Registration failed: ${error.message}`);
                
                // Log error
                Logger.logError('registration_error', error);
            });
    },
    
    // Login user
    loginUser: function(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.querySelector('input[name="remember"]')?.checked || false;
        
        // Set persistence based on remember me checkbox
        const persistence = rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
        
        auth.setPersistence(persistence)
            .then(() => {
                return auth.signInWithEmailAndPassword(email, password);
            })
            .then(userCredential => {
                const user = userCredential.user;
                
                // Get user role and redirect to appropriate dashboard
                return this.getUserRole(user.uid);
            })
            .then(role => {
                if (role) {
                    window.location.href = `dashboard-${role}.html`;
                } else {
                    throw new Error('User role not found');
                }
            })
            .catch(error => {
                console.error('Error logging in:', error);
                alert(`Login failed: ${error.message}`);
                
                // Log error
                Logger.logError('login_error', error);
            });
    },
    
    // Logout user
    logoutUser: function() {
        auth.signOut()
            .then(() => {
                // Log logout event
                Logger.logEvent('user_logged_out');
                
                // Redirect to home page
                window.location.href = '../index.html';
            })
            .catch(error => {
                console.error('Error logging out:', error);
                
                // Log error
                Logger.logError('logout_error', error);
            });
    },
    
    // Update user profile
    updateProfile: function(event) {
        event.preventDefault();
        
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in to update your profile.');
            return;
        }
        
        const name = document.getElementById('profile-name').value;
        const bio = document.getElementById('profile-bio').value;
        const avatarFile = document.getElementById('profile-avatar').files[0];
        
        // Get user role to determine which fields to update
        this.getUserRole(user.uid).then(role => {
            let updateData = {
                name,
                bio,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add role-specific data
            switch (role) {
                case 'investor':
                    const investmentRange = document.getElementById('investment-range').value;
                    const industries = Array.from(document.querySelectorAll('input[name="industry"]:checked')).map(cb => cb.value);
                    
                    updateData = {
                        ...updateData,
                        investmentRange,
                        industries
                    };
                    break;
                    
                case 'business':
                    const industry = document.getElementById('business-industry').value;
                    const businessStage = document.getElementById('business-stage').value;
                    
                    updateData = {
                        ...updateData,
                        industry,
                        businessStage
                    };
                    break;
                    
                case 'banker':
                    const bankName = document.getElementById('bank-name').value;
                    const bankPosition = document.getElementById('bank-position').value;
                    
                    updateData = {
                        ...updateData,
                        bankName,
                        bankPosition
                    };
                    break;
                    
                case 'advisor':
                    const expertise = Array.from(document.querySelectorAll('input[name="expertise"]:checked')).map(cb => cb.value);
                    const experience = document.getElementById('experience').value;
                    
                    updateData = {
                        ...updateData,
                        expertise,
                        experience
                    };
                    break;
            }
            
            // If avatar file is selected, upload it first
            if (avatarFile) {
                const storage = firebase.storage();
                const storageRef = storage.ref();
                const avatarRef = storageRef.child(`avatars/${user.uid}`);
                
                avatarRef.put(avatarFile).then(snapshot => {
                    return snapshot.ref.getDownloadURL();
                })
                .then(downloadURL => {
                    // Add avatar URL to update data
                    updateData.avatarUrl = downloadURL;
                    
                    // Update user document
                    return db.collection('users').doc(user.uid).update(updateData);
                })
                .then(() => {
                    alert('Profile updated successfully!');
                    
                    // Close modal
                    document.getElementById('profile-modal').classList.remove('active');
                    
                    // Update UI
                    this.updateUserInfo(user);
                    
                    // Log profile update event
                    Logger.logEvent('profile_updated', { with_avatar: true });
                })
                .catch(error => {
                    console.error('Error updating profile:', error);
                    alert(`Profile update failed: ${error.message}`);
                    
                    // Log error
                    Logger.logError('profile_update_error', error);
                });
            } else {
                // Update user document without avatar
                db.collection('users').doc(user.uid).update(updateData)
                    .then(() => {
                        alert('Profile updated successfully!');
                        
                        // Close modal
                        document.getElementById('profile-modal').classList.remove('active');
                        
                        // Update UI
                        this.updateUserInfo(user);
                        
                        // Log profile update event
                        Logger.logEvent('profile_updated', { with_avatar: false });
                    })
                    .catch(error => {
                        console.error('Error updating profile:', error);
                        alert(`Profile update failed: ${error.message}`);
                        
                        // Log error
                        Logger.logError('profile_update_error', error);
                    });
            }
        });
    }
};

// Initialize auth functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    Auth.checkAuthState();
    
    // Register form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            Auth.registerUser(e);
        });
    }
    
    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            Auth.loginUser(e);
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            Auth.logoutUser();
        });
    }
    
    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            Auth.updateProfile(e);
        });
    }
});