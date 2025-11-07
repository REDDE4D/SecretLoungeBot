"use client";

import { useState, useEffect } from "react";
import EmojiPicker from "../common/EmojiPicker";

interface SystemRoleEditDialogProps {
  role: {
    id: string;
    name: string;
    description: string;
    emoji?: string;
    color: string;
    permissions: string[];
    isSystemRole: boolean;
    isEditable?: boolean;
  };
  allPermissions: Record<string, any[]>;
  onClose: () => void;
  onSave: (updates: {
    emoji?: string;
    color?: string;
    description?: string;
    permissions?: string[];
  }) => Promise<void>;
}

const COLOR_OPTIONS = [
  { value: "red", label: "Red", hex: "#EF4444" },
  { value: "blue", label: "Blue", hex: "#3B82F6" },
  { value: "green", label: "Green", hex: "#10B981" },
  { value: "amber", label: "Amber", hex: "#F59E0B" },
  { value: "purple", label: "Purple", hex: "#A855F7" },
  { value: "pink", label: "Pink", hex: "#EC4899" },
  { value: "gray", label: "Gray", hex: "#6B7280" },
];

export default function SystemRoleEditDialog({
  role,
  allPermissions,
  onClose,
  onSave,
}: SystemRoleEditDialogProps) {
  const [emoji, setEmoji] = useState(role.emoji || "");
  const [color, setColor] = useState(role.color || "gray");
  const [description, setDescription] = useState(role.description || "");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(role.permissions)
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleTogglePermission = (permissionId: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setSelectedPermissions(newSet);
  };

  const handleToggleCategory = (category: string) => {
    const categoryPermissions = allPermissions[category]?.map((p) => p.id) || [];
    const allSelected = categoryPermissions.every((id) =>
      selectedPermissions.has(id)
    );

    const newSet = new Set(selectedPermissions);
    categoryPermissions.forEach((id) => {
      if (allSelected) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
    });
    setSelectedPermissions(newSet);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: any = {};
      if (emoji !== role.emoji) updates.emoji = emoji;
      if (color !== role.color) updates.color = color;
      if (description !== role.description) updates.description = description;
      if (
        JSON.stringify([...selectedPermissions].sort()) !==
        JSON.stringify([...role.permissions].sort())
      ) {
        updates.permissions = Array.from(selectedPermissions);
      }

      await onSave(updates);
      onClose();
    } catch (error) {
      console.error("Error saving role:", error);
      alert("Failed to save role. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit {role.name} Role
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Customize emoji, color, and permissions
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Emoji Picker */}
            <div>
              <EmojiPicker
                value={emoji}
                onChange={setEmoji}
                label="Role Emoji"
                placeholder="Select an emoji for this role"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This emoji will appear after user alias in chat messages
              </p>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Color
              </label>
              <div className="grid grid-cols-7 gap-3">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setColor(option.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      color === option.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: option.hex }}
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Brief description of this role..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {description.length}/500 characters
              </p>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Permissions
              </h3>

              <div className="space-y-4">
                {Object.entries(allPermissions).map(([category, permissions]) => {
                  const categoryPerms = permissions.map((p) => p.id);
                  const allSelected = categoryPerms.every((id) =>
                    selectedPermissions.has(id)
                  );
                  const someSelected = categoryPerms.some((id) =>
                    selectedPermissions.has(id)
                  );

                  return (
                    <div
                      key={category}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                          {category}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(category)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {allSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>

                      {/* Permission Checkboxes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {permissions.map((perm: any) => (
                          <label
                            key={perm.id}
                            className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(perm.id)}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {perm.action}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {perm.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
