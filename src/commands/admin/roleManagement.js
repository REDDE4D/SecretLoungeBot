/**
 * Role Management System - Main Entry Point
 * Registers all role management commands and handlers
 */

import * as createRole from './roles/createRole.js';
import * as listRoles from './roles/listRoles.js';
import * as editRole from './roles/editRole.js';
import * as deleteRole from './roles/deleteRole.js';
import * as roleAssignment from './roleAssignment.js';

export const meta = {
  commands: [
    // Role CRUD
    'role_create',
    'newrole',
    'role_list',
    'roles',
    'role_info',
    'role_edit',
    'role_delete',
    // Role assignment
    'setrole',
    'removerole',
    'clearroles',
    'whohas',
  ],
  category: 'admin',
  roleRequired: 'admin',
  description: 'Manage custom roles and permissions',
  usage: 'Use /role_list to see all available commands',
  showInMenu: false,
};

export function register(bot) {
  // Register all role management sub-modules
  createRole.register(bot);
  listRoles.register(bot);
  editRole.register(bot);
  deleteRole.register(bot);
  roleAssignment.register(bot);
}
