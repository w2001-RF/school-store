import { db } from '../database/index.js'

export const AuthService = {
  signIn: (creds) => db.signIn(creds),
  signUp: (creds) => db.signUp(creds),
  signOut: () => db.signOut(),
  currentUser: () => db.getCurrentUser(),
  onAuthStateChange: (cb) => db.onAuthStateChange(cb),

  hasRole(user, ...roles) {
    return user && roles.includes(user.role)
  },

  isManager(user) { return this.hasRole(user, 'manager') },
  isAgent(user)   { return this.hasRole(user, 'agent', 'manager') }
}
