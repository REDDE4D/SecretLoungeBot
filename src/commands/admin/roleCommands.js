/**
 * Role Management System - Unified Command Registration
 * This file registers all role management commands from the roles/ subdirectory
 */

import * as createRole from './roles/createRole.js';
import * as listRoles from './roles/listRoles.js';
import * as editRole from './roles/editRole.js';
import * as deleteRole from './roles/deleteRole.js';
import * as roleAssignment from './roles/roleAssignment.js';

export const meta = {
  commands: [
    // Role CRUD
    ...createRole.meta.commands,
    ...listRoles.meta.commands,
    ...editRole.meta.commands,
    ...deleteRole.meta.commands,
    // Role assignment
    ...roleAssignment.meta.commands,
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
