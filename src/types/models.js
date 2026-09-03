/**
 * @file JSDoc type definitions for SaaS Phase 1 (multi-tenancy) models.
 * These are documentation-only; no runtime behavior is affected.
 */

/**
 * @typedef {Object} Organization
 * @property {string} id
 * @property {string} name
 * @property {string=} slug
 * @property {string=} legal_name
 * @property {string=} phone
 * @property {string=} email
 * @property {string=} address
 * @property {string=} city
 * @property {string=} country
 * @property {string=} tax_number
 * @property {string=} logo_url
 * @property {string} currency
 * @property {string} timezone
 * @property {'active'|'suspended'|'pending'|'cancelled'} status
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} OrganizationMember
 * @property {string} id
 * @property {string} organization_id
 * @property {string} user_id
 * @property {'owner'|'manager'|'cashier'|'stock_manager'|'accountant'|'viewer'} role
 * @property {'active'|'invited'|'suspended'} status
 * @property {string} created_at
 * @property {string} updated_at
 */

export {}
